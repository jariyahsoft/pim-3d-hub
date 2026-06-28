import { describe, it, expect, beforeEach } from 'vitest'
import { createConversationService } from './conversation.js'
import {
  createInMemoryConversationRepository,
  createInMemoryConversationMemberRepository,
  createInMemoryMessageRepository,
  createInMemoryReadMarkerRepository,
  createInMemoryFileAssetRepository,
  createInMemoryFileAssetAccessGrantRepository,
  createFakeClock,
  createQueuedUuidGenerator,
} from '@pim/testkit'
import type { Uuidv7 } from '@pim/domain'
import { AuthorizationDeniedError } from './errors.js'

describe('ConversationService', () => {
  let clock: ReturnType<typeof createFakeClock>
  let uuidGen: ReturnType<typeof createQueuedUuidGenerator>
  let conversationRepo: ReturnType<typeof createInMemoryConversationRepository>
  let memberRepo: ReturnType<typeof createInMemoryConversationMemberRepository>
  let messageRepo: ReturnType<typeof createInMemoryMessageRepository>
  let readMarkerRepo: ReturnType<typeof createInMemoryReadMarkerRepository>
  let fileAssetRepo: ReturnType<typeof createInMemoryFileAssetRepository>
  let grantRepo: ReturnType<typeof createInMemoryFileAssetAccessGrantRepository>
  let service: ReturnType<typeof createConversationService>

  let buyerId: Uuidv7
  let providerId: Uuidv7
  let requestId: Uuidv7
  let assetId: Uuidv7

  beforeEach(() => {
    clock = createFakeClock()
    uuidGen = createQueuedUuidGenerator()
    conversationRepo = createInMemoryConversationRepository(clock, uuidGen)
    memberRepo = createInMemoryConversationMemberRepository(clock, uuidGen)
    messageRepo = createInMemoryMessageRepository(clock, uuidGen)
    readMarkerRepo = createInMemoryReadMarkerRepository(clock, uuidGen)
    fileAssetRepo = createInMemoryFileAssetRepository(clock, uuidGen)
    grantRepo = createInMemoryFileAssetAccessGrantRepository(clock, uuidGen)

    service = createConversationService({
      conversationMemberRepository: memberRepo,
      conversationRepository: conversationRepo,
      fileAssetAccessGrantRepository: grantRepo,
      fileAssetRepository: fileAssetRepo,
      messageRepository: messageRepo,
      now: () => clock.now(),
      readMarkerRepository: readMarkerRepo,
    })

    buyerId = uuidGen.generate() as Uuidv7
    providerId = uuidGen.generate() as Uuidv7
    requestId = uuidGen.generate() as Uuidv7
    assetId = uuidGen.generate() as Uuidv7
  })

  describe('createConversation', () => {
    it('creates conversation with participants', async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Service Request Discussion',
      })

      expect(conversation.id).toBeDefined()
      expect(conversation.contextId).toBe(requestId)
      expect(conversation.contextType).toBe('SERVICE_REQUEST')
      expect(conversation.title).toBe('Service Request Discussion')
      expect(conversation.participantCount).toBe(2)
      expect(conversation.status).toBe('ACTIVE')
    })

    it('returns existing conversation for same context', async () => {
      const first = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Discussion 1',
      })

      const second = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Discussion 2',
      })

      expect(second.id).toBe(first.id)
    })

    it('rejects conversation without participants', async () => {
      await expect(
        service.createConversation(buyerId, {
          contextId: requestId,
          contextType: 'SERVICE_REQUEST',
          participantUserIds: [],
          title: 'Empty Discussion',
        }),
      ).rejects.toThrow('At least one participant is required')
    })

    it('rejects conversation without title', async () => {
      await expect(
        service.createConversation(buyerId, {
          contextId: requestId,
          contextType: 'SERVICE_REQUEST',
          participantUserIds: [buyerId],
          title: '   ',
        }),
      ).rejects.toThrow('Conversation title is required')
    })
  })

  describe('sendMessage', () => {
    let conversationId: Uuidv7

    beforeEach(async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })
      conversationId = conversation.id
    })

    it('sends message from active participant', async () => {
      const message = await service.sendMessage(buyerId, {
        conversationId,
        textContent: 'Hello, can you help with this?',
      })

      expect(message.id).toBeDefined()
      expect(message.conversationId).toBe(conversationId)
      expect(message.senderId).toBe(buyerId)
      expect(message.textContent).toBe('Hello, can you help with this?')
      expect(message.status).toBe('SENT')
    })

    it('sanitizes message text for XSS protection', async () => {
      const message = await service.sendMessage(buyerId, {
        conversationId,
        textContent: '<script>alert("xss")</script>Hello onclick="bad"',
      })

      expect(message.textContent).not.toContain('<script>')
      expect(message.textContent).not.toContain('onclick')
      expect(message.textContent).not.toContain('javascript:')
    })

    it('rejects empty message', async () => {
      await expect(
        service.sendMessage(buyerId, {
          conversationId,
          textContent: '   ',
        }),
      ).rejects.toThrow('Message text is required')
    })

    it('rejects oversized message', async () => {
      const longText = 'a'.repeat(10001)

      await expect(
        service.sendMessage(buyerId, {
          conversationId,
          textContent: longText,
        }),
      ).rejects.toThrow('exceeds maximum length')
    })

    it('rejects message from non-participant', async () => {
      const outsiderId = uuidGen.generate() as Uuidv7

      await expect(
        service.sendMessage(outsiderId, {
          conversationId,
          textContent: 'Hello',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('allows message with owned attachment', async () => {
      await fileAssetRepo.create({
        mimeType: 'image/png',
        objectKey: 'uploads/test.png',
        originalFilename: 'test.png',
        ownerUserId: buyerId,
        purpose: 'chat-attachment',
        sizeBytes: 1024,
        storageProvider: 'gcs',
      })

      const message = await service.sendMessage(buyerId, {
        attachmentAssetIds: [assetId],
        conversationId,
        textContent: 'Here is the file',
      })

      expect(message.attachmentAssetIds).toEqual([assetId])
    })

    it('rejects message with unauthorized attachment', async () => {
      await fileAssetRepo.create({
        mimeType: 'image/png',
        objectKey: 'uploads/private.png',
        originalFilename: 'private.png',
        ownerUserId: providerId,
        purpose: 'private-doc',
        sizeBytes: 1024,
        storageProvider: 'gcs',
      })

      await expect(
        service.sendMessage(buyerId, {
          attachmentAssetIds: [assetId],
          conversationId,
          textContent: 'Attaching private file',
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('rejects too many attachments', async () => {
      const manyAssets = Array.from({ length: 11 }, () => uuidGen.generate() as Uuidv7)

      await expect(
        service.sendMessage(buyerId, {
          attachmentAssetIds: manyAssets,
          conversationId,
          textContent: 'Many files',
        }),
      ).rejects.toThrow('Maximum 10 attachments allowed')
    })
  })

  describe('listMessages', () => {
    let conversationId: Uuidv7

    beforeEach(async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })
      conversationId = conversation.id
    })

    it('lists messages for participant', async () => {
      await service.sendMessage(buyerId, {
        conversationId,
        textContent: 'Message 1',
      })

      await service.sendMessage(providerId, {
        conversationId,
        textContent: 'Message 2',
      })

      const page = await service.listMessages(buyerId, {
        conversationId,
        limit: 10,
      })

      expect(page.items).toHaveLength(2)
      expect(page.items[0]?.textContent).toBe('Message 1')
      expect(page.items[1]?.textContent).toBe('Message 2')
    })

    it('rejects list for non-participant', async () => {
      const outsiderId = uuidGen.generate() as Uuidv7

      await expect(
        service.listMessages(outsiderId, {
          conversationId,
          limit: 10,
        }),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await service.sendMessage(buyerId, {
          conversationId,
          textContent: `Message ${i}`,
        })
      }

      const page1 = await service.listMessages(buyerId, {
        conversationId,
        limit: 2,
      })

      expect(page1.items).toHaveLength(2)
      expect(page1.nextCursor).toBeDefined()

      const page2 = await service.listMessages(buyerId, {
        conversationId,
        cursor: page1.nextCursor!,
        limit: 2,
      })

      expect(page2.items).toHaveLength(2)
      expect(page2.items[0]?.textContent).not.toBe(page1.items[0]?.textContent)
    })
  })

  describe('markAsRead', () => {
    let conversationId: Uuidv7
    let messageId: Uuidv7

    beforeEach(async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })
      conversationId = conversation.id

      const message = await service.sendMessage(providerId, {
        conversationId,
        textContent: 'Hello buyer',
      })
      messageId = message.id
    })

    it('marks message as read for participant', async () => {
      await expect(
        service.markAsRead(buyerId, conversationId, messageId),
      ).resolves.toBeUndefined()

      const marker = await readMarkerRepo.findByConversationAndUser(conversationId, buyerId)

      expect(marker).toBeDefined()
      expect(marker?.lastReadMessageId).toBe(messageId)
    })

    it('rejects marking for non-participant', async () => {
      const outsiderId = uuidGen.generate() as Uuidv7

      await expect(
        service.markAsRead(outsiderId, conversationId, messageId),
      ).rejects.toThrow(AuthorizationDeniedError)
    })

    it('rejects marking message from different conversation', async () => {
      const otherConversation = await service.createConversation(buyerId, {
        contextId: uuidGen.generate() as Uuidv7,
        contextType: 'ORDER',
        participantUserIds: [buyerId],
        title: 'Other',
      })

      await expect(
        service.markAsRead(buyerId, otherConversation.id, messageId),
      ).rejects.toThrow('Message not found in conversation')
    })
  })

  describe('hideMessage', () => {
    let conversationId: Uuidv7
    let messageId: Uuidv7

    beforeEach(async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })
      conversationId = conversation.id

      const message = await service.sendMessage(buyerId, {
        conversationId,
        textContent: 'Oops wrong message',
      })
      messageId = message.id
    })

    it('allows sender to hide their own message', async () => {
      const hidden = await service.hideMessage(buyerId, messageId)

      expect(hidden.status).toBe('HIDDEN')
      expect(hidden.hiddenAt).toBeDefined()
    })

    it('rejects hiding message from another sender', async () => {
      await expect(
        service.hideMessage(providerId, messageId),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })

  describe('moderateMessage', () => {
    let conversationId: Uuidv7
    let messageId: Uuidv7

    beforeEach(async () => {
      const conversation = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })
      conversationId = conversation.id

      const message = await service.sendMessage(buyerId, {
        conversationId,
        textContent: 'Spam content',
      })
      messageId = message.id
    })

    it('moderates message with reason', async () => {
      const moderatorId = uuidGen.generate() as Uuidv7

      const moderated = await service.moderateMessage(
        moderatorId,
        messageId,
        'Contains spam',
      )

      expect(moderated.status).toBe('MODERATED')
      expect(moderated.isModerated).toBe(true)
    })

    it('rejects moderation without reason', async () => {
      const moderatorId = uuidGen.generate() as Uuidv7

      await expect(
        service.moderateMessage(moderatorId, messageId, '   '),
      ).rejects.toThrow('Moderation reason is required')
    })
  })

  describe('listConversations', () => {
    it('lists conversations for participant', async () => {
      await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Request Chat',
      })

      const orderId = uuidGen.generate() as Uuidv7
      await service.createConversation(buyerId, {
        contextId: orderId,
        contextType: 'ORDER',
        participantUserIds: [buyerId, providerId],
        title: 'Order Chat',
      })

      const page = await service.listConversations(buyerId, {
        limit: 10,
      })

      expect(page.items).toHaveLength(2)
    })

    it('filters conversations by context type', async () => {
      await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Request Chat',
      })

      const orderId = uuidGen.generate() as Uuidv7
      await service.createConversation(buyerId, {
        contextId: orderId,
        contextType: 'ORDER',
        participantUserIds: [buyerId, providerId],
        title: 'Order Chat',
      })

      const page = await service.listConversations(buyerId, {
        contextType: 'ORDER',
        limit: 10,
      })

      expect(page.items).toHaveLength(1)
      expect(page.items[0]?.contextType).toBe('ORDER')
    })
  })

  describe('getConversation', () => {
    it('retrieves conversation for participant', async () => {
      const created = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })

      const retrieved = await service.getConversation(buyerId, created.id)

      expect(retrieved.id).toBe(created.id)
      expect(retrieved.title).toBe('Chat')
    })

    it('rejects retrieval for non-participant', async () => {
      const created = await service.createConversation(buyerId, {
        contextId: requestId,
        contextType: 'SERVICE_REQUEST',
        participantUserIds: [buyerId, providerId],
        title: 'Chat',
      })

      const outsiderId = uuidGen.generate() as Uuidv7

      await expect(
        service.getConversation(outsiderId, created.id),
      ).rejects.toThrow(AuthorizationDeniedError)
    })
  })
})
