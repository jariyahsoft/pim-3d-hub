import { describe, it, expect } from 'vitest';
import {
  SCREEN_LABELS,
  SCREEN_STATE_LABELS,
  ORDER_STATUS_LABELS,
  loadingState,
  loadedState,
  errorState,
  offlineState,
  expiredState,
} from './buyer-flows.js';

describe('buyer-flows', () => {
  it('has Thai screen labels for all core screens', () => {
    expect(SCREEN_LABELS.HOME).toBe('หน้าหลัก');
    expect(SCREEN_LABELS.EXPLORE).toBe('สำรวจ');
    expect(SCREEN_LABELS.CHECK_PRICE).toBe('เช็คราคา');
    expect(SCREEN_LABELS.COMPARE_QUOTES).toBe('เปรียบเทียบราคา');
    expect(SCREEN_LABELS.CHECKOUT).toBe('ชำระเงิน');
    expect(SCREEN_LABELS.ORDER_TRACKING).toBe('ติดตามคำสั่งซื้อ');
    expect(SCREEN_LABELS.LOGIN).toBe('เข้าสู่ระบบ');
  });

  it('has Thai state labels for all ScreenState values', () => {
    expect(SCREEN_STATE_LABELS.LOADING).toBe('กำลังโหลด...');
    expect(SCREEN_STATE_LABELS.OFFLINE).toContain('ไม่มีการเชื่อมต่อ');
    expect(SCREEN_STATE_LABELS.ERROR).toContain('เกิดข้อผิดพลาด');
    expect(SCREEN_STATE_LABELS.EXPIRED).toContain('เซสชันหมดอายุ');
    expect(SCREEN_STATE_LABELS.CONFLICT).toContain('เปลี่ยนแปลง');
    expect(SCREEN_STATE_LABELS.FORBIDDEN).toContain('ไม่มีสิทธิ์');
  });

  it('has Thai order status labels for all known statuses', () => {
    expect(ORDER_STATUS_LABELS.DRAFT).toBe('ร่าง');
    expect(ORDER_STATUS_LABELS.PENDING_PAYMENT).toBe('รอชำระเงิน');
    expect(ORDER_STATUS_LABELS.PAID).toBe('ชำระแล้ว');
    expect(ORDER_STATUS_LABELS.FULFILLING).toBe('กำลังดำเนินการ');
    expect(ORDER_STATUS_LABELS.SHIPPED).toBe('จัดส่งแล้ว');
    expect(ORDER_STATUS_LABELS.DELIVERED).toBe('ได้รับแล้ว');
    expect(ORDER_STATUS_LABELS.COMPLETED).toBe('เสร็จสมบูรณ์');
    expect(ORDER_STATUS_LABELS.CANCELLED).toBe('ยกเลิก');
    expect(ORDER_STATUS_LABELS.REFUNDED).toBe('คืนเงินแล้ว');
  });

  it('loadingState returns LOADING with null data', () => {
    const s = loadingState();
    expect(s.state).toBe('LOADING');
    expect(s.data).toBeNull();
  });

  it('loadedState returns LOADED with data', () => {
    const s = loadedState([1, 2, 3]);
    expect(s.state).toBe('LOADED');
    expect(s.data).toEqual([1, 2, 3]);
  });

  it('errorState returns ERROR with message', () => {
    const s = errorState('network failure');
    expect(s.state).toBe('ERROR');
    expect(s.errorMessage).toBe('network failure');
  });

  it('errorState defaults to generic message', () => {
    const s = errorState();
    expect(s.errorMessage).toBe('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
  });

  it('offlineState returns OFFLINE', () => {
    const s = offlineState();
    expect(s.state).toBe('OFFLINE');
  });

  it('expiredState returns EXPIRED', () => {
    const s = expiredState();
    expect(s.state).toBe('EXPIRED');
  });
});
