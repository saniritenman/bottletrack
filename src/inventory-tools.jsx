import React, { useEffect, useId, useRef, useState } from 'react';
import { Archive, CloudUpload, RotateCcw, X, Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

export const featureMessages = {
  en: {
    pendingTitle: 'Pending uploads', retryAll: 'Retry all', pendingEmpty: 'Everything is uploaded.', pendingWaiting: 'Waiting', pendingUploading: 'Uploading', pendingFailed: 'Failed — will retry', pendingCreated: 'New product', pendingUpdated: 'Changes', pendingDeleted: 'Deletion', unnamedProduct: 'Removed product', pendingHint: 'Changes stay on this device until the server confirms them.', sharedDisconnected: 'Shared sync is not connected on this device.',
    remindersTitle: 'Expiry reminders', within7: 'Within 7 days', within14: 'Within 14 days', within30: 'Within 30 days',
    backupsTitle: 'Automatic backups', backupHint: 'On this device · up to 14 copies. Changes are backed up every 30 minutes and before a restore.', backupEmpty: 'Your first backup appears after products are saved.', backupNow: 'Save backup now', backupRestore: 'Restore', backupRestoring: 'Restoring…', backupConfirm: 'Restore this copy? It will replace the inventory shown here and sync to other devices. A copy of the current inventory will be saved first.', backupRestored: 'Backup restored', backupSaved: 'Backup saved', backupFailed: 'Could not save the backup. Your inventory has not been replaced.', backupAutomatic: 'Automatic', backupManual: 'Manual', backupBeforeRestore: 'Before restore', backupCount: 'products',
    continuousScan: 'Keep scanning', continuousHint: 'After saving a product, return to the camera automatically.', scanSessionCount: 'Saved this session', finishScanning: 'Finish scanning', saveAndScan: 'Save & scan next', savedQueued: 'Saved on this device. Upload queued.',
  },
  he: {
    pendingTitle: 'העלאות ממתינות', retryAll: 'ניסיון חוזר לכולם', pendingEmpty: 'כל השינויים הועלו.', pendingWaiting: 'ממתין', pendingUploading: 'מעלה…', pendingFailed: 'נכשל — ננסה שוב', pendingCreated: 'מוצר חדש', pendingUpdated: 'שינויים', pendingDeleted: 'מחיקה', unnamedProduct: 'מוצר שהוסר', pendingHint: 'השינויים נשמרים במכשיר עד שהשרת מאשר את ההעלאה.', sharedDisconnected: 'הסנכרון המשותף אינו מחובר במכשיר הזה.',
    remindersTitle: 'תזכורות תפוגה', within7: 'בתוך 7 ימים', within14: 'בתוך 14 ימים', within30: 'בתוך 30 ימים',
    backupsTitle: 'גיבויים אוטומטיים', backupHint: 'במכשיר הזה · עד 14 עותקים. שינויים מגובים כל 30 דקות ולפני שחזור.', backupEmpty: 'הגיבוי הראשון יופיע לאחר שמירת מוצרים.', backupNow: 'גיבוי עכשיו', backupRestore: 'שחזור', backupRestoring: 'משחזר…', backupConfirm: 'לשחזר את העותק הזה? הוא יחליף את המלאי המוצג ויסונכרן לשאר המכשירים. קודם יישמר גיבוי של המלאי הנוכחי.', backupRestored: 'הגיבוי שוחזר', backupSaved: 'הגיבוי נשמר', backupFailed: 'לא ניתן לשמור גיבוי. המלאי לא הוחלף.', backupAutomatic: 'אוטומטי', backupManual: 'ידני', backupBeforeRestore: 'לפני שחזור', backupCount: 'מוצרים',
    continuousScan: 'סריקה רציפה', continuousHint: 'אחרי שמירת מוצר חוזרים למצלמה באופן אוטומטי.', scanSessionCount: 'נשמרו בסריקה הזאת', finishScanning: 'סיום סריקה', saveAndScan: 'שמירה וסריקת הבא', savedQueued: 'נשמר במכשיר. ההעלאה ממתינה.',
  },
  ru: {
    pendingTitle: 'Ожидают загрузки', retryAll: 'Повторить все', pendingEmpty: 'Все изменения загружены.', pendingWaiting: 'Ожидание', pendingUploading: 'Загрузка…', pendingFailed: 'Ошибка — повторим', pendingCreated: 'Новый товар', pendingUpdated: 'Изменения', pendingDeleted: 'Удаление', unnamedProduct: 'Удалённый товар', pendingHint: 'Изменения хранятся на устройстве до подтверждения сервера.', sharedDisconnected: 'Общая синхронизация не подключена на этом устройстве.',
    remindersTitle: 'Напоминания о сроках', within7: 'В течение 7 дней', within14: 'В течение 14 дней', within30: 'В течение 30 дней',
    backupsTitle: 'Автоматические копии', backupHint: 'На этом устройстве · до 14 копий. Изменения сохраняются каждые 30 минут и перед восстановлением.', backupEmpty: 'Первая копия появится после сохранения товаров.', backupNow: 'Сохранить копию', backupRestore: 'Восстановить', backupRestoring: 'Восстановление…', backupConfirm: 'Восстановить эту копию? Она заменит показанный запас и синхронизируется с другими устройствами. Сначала будет сохранена текущая копия.', backupRestored: 'Копия восстановлена', backupSaved: 'Копия сохранена', backupFailed: 'Не удалось сохранить копию. Запас не был заменён.', backupAutomatic: 'Автоматически', backupManual: 'Вручную', backupBeforeRestore: 'Перед восстановлением', backupCount: 'товаров',
    continuousScan: 'Непрерывное сканирование', continuousHint: 'После сохранения товара камера открывается автоматически.', scanSessionCount: 'Сохранено за сеанс', finishScanning: 'Завершить', saveAndScan: 'Сохранить и сканировать', savedQueued: 'Сохранено на устройстве. Ожидает загрузки.',
  },
};

function FeatureDialog({ title, children, onClose, closeLabel }) {
  const id = useId(), dialogRef = useRef(null), closeRef = useRef(null), callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => {
    const oldFocus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeRef.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') callback.current();
      if (event.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (oldFocus?.isConnected) oldFocus.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="modal inventory-tools-modal" role="dialog" aria-modal="true" aria-labelledby={id}><div className="modal-heading"><h2 id={id}>{title}</h2><button ref={closeRef} className="icon-btn" type="button" onClick={onClose} aria-label={closeLabel}><X/></button></div>{children}</section></div>;
}

export function PendingUploadsDialog({ entries, status, enabled, t, formatTime, onRetry, onClose }) {
  const labels = { waiting: t.pendingWaiting, uploading: t.pendingUploading, failed: t.pendingFailed };
  const types = { created: t.pendingCreated, updated: t.pendingUpdated, deleted: t.pendingDeleted };
  return <FeatureDialog title={t.pendingTitle} closeLabel={t.close} onClose={onClose}>
    <p className="modal-description">{enabled ? t.pendingHint : t.sharedDisconnected}</p>
    {status === 'error' && <p className="inline-error" role="status">{t.syncError}</p>}
    {entries.length ? <ul className="upload-list">{entries.map(entry => <li key={`${entry.type}:${entry.id}`}><CloudUpload size={21}/><div><strong>{entry.name || entry.barcode || t.unnamedProduct}</strong><small>{types[entry.type]}{entry.at && <> · {formatTime(entry.at)}</>}</small></div><span className={`upload-state upload-${entry.status}`}>{labels[entry.status]}</span></li>)}</ul> : <div className="tools-empty"><CheckCircle2 size={30}/><p>{enabled ? t.pendingEmpty : t.syncLocal}</p></div>}
    <div className="modal-footer"><button className="button secondary" onClick={onClose}>{t.close}</button><button className="button primary" onClick={onRetry} disabled={!enabled || status === 'loading'}><RotateCcw size={16}/>{status === 'loading' ? t.syncSaving : t.retryAll}</button></div>
  </FeatureDialog>;
}

export function BackupsDialog({ backups, error, t, formatTime, onCapture, onRestore, onClose }) {
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false);
  const perform = async action => { setBusy(true); try { await action(); setSelected(null); } finally { setBusy(false); } };
  return <FeatureDialog title={t.backupsTitle} closeLabel={t.close} onClose={() => { if (!busy) onClose(); }}>
    <p className="modal-description">{t.backupHint}</p>{error && <p className="inline-error" role="status">{t.backupFailed}</p>}
    {selected && <div className="backup-confirm" role="alert"><AlertTriangle size={22}/><p>{t.backupConfirm}</p><div><button className="button secondary" disabled={busy} onClick={() => setSelected(null)}>{t.cancel}</button><button className="button primary" disabled={busy} onClick={() => perform(() => onRestore(selected.id))}>{busy ? t.backupRestoring : t.backupRestore}</button></div></div>}
    <ul className="backup-list">{backups.map(backup => <li key={backup.id}><Archive size={22}/><div><strong>{formatTime(backup.createdAt)}</strong><small>{backup.count} {t.backupCount} · {backup.reason === 'before-restore' ? t.backupBeforeRestore : backup.reason === 'manual' ? t.backupManual : t.backupAutomatic}</small></div><button className="button secondary" disabled={busy} onClick={() => setSelected(backup)}>{t.backupRestore}</button></li>)}</ul>
    {!backups.length && <p className="tools-empty">{t.backupEmpty}</p>}
    <div className="modal-footer"><button className="button secondary" disabled={busy} onClick={onClose}>{t.close}</button><button className="button primary" disabled={busy} onClick={() => perform(onCapture)}><Archive size={16}/>{t.backupNow}</button></div>
  </FeatureDialog>;
}

export function ExpiryReminderBar({ products, currentDate, activeWindow, onSelect, isExpiring, t }) {
  return <section className="expiry-reminders" aria-label={t.remindersTitle}><h2><Bell size={18}/>{t.remindersTitle}</h2><div>{[7, 14, 30].map(days => <button type="button" key={days} className={activeWindow === days ? 'reminder-selected' : ''} aria-pressed={activeWindow === days} onClick={() => onSelect(days)}><span>{t[`within${days}`]}</span><strong>{products.filter(product => isExpiring(product, days, currentDate)).length}</strong></button>)}</div></section>;
}
