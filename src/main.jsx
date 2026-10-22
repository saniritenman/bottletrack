import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Barcode, Search, Plus, Package, CalendarClock, AlertTriangle, CheckCircle2,
  Clock3, Camera, ImagePlus, X, Download, Upload, Languages,
  ChevronDown, Trash2, Pencil, Filter, Menu, Wine, CalendarDays,
  Save, ScanLine, CircleHelp, RotateCcw, ArrowUpRight, Moon, Sun
} from 'lucide-react';
import './styles.css';
import { createProduct, normalizeDatabase, updateProduct } from './product-model.js';
import { fetchSharedDatabase, initializeSharedDatabase, saveSharedDatabase, sharedStorageEnabled } from './shared-storage.js';
import { compressProductPhoto, isDisplayableProductPhoto } from './photo-utils.js';

const STORAGE_KEY = 'bottletrack.data.v1';
const LANG_KEY = 'bottletrack.lang';
const THEME_KEY = 'bottletrack.theme';
const today = () => new Date().toISOString().slice(0,10);
const emptyDB = { products: [], activity: [] };
const messages = {
  en: {
    app:'BottleTrack', branchLabel:'Bana Mashkaot · Sderot Branch', photoProcessing:'Preparing photo…', tagline:'Your stock. In date. Under control.', overview:'Overview', inventory:'Inventory',
    expiring:'Expiring soon', expired:'Expired', products:'Products', tracked:'Tracked products',
    search:'Search name or barcode…', scan:'Scan barcode', add:'Add product', addLot:'Add expiry date',
    all:'All products', ok:'In date', soon:'Expiring soon', overdue:'Expired', noProducts:'No products yet',
    noProductsHint:'Scan a bottle or add your first product to track expiration dates.',
    barcode:'Barcode', name:'Product name', size:'Bottle size (optional)', size330:'330 ml', size500:'500 ml', size750:'750 ml', size1500:'1.5 L', sizeCan:'Can', size500Can:'500 ml Can',
    expiry:'Expiration date', photo:'Product photo (optional)',
    save:'Save product', saveLot:'Save date', cancel:'Cancel', edit:'Edit', history:'History',
    details:'Product details', dateHistory:'Expiration history',
    latestExpiry:'Next expiration', added:'Added', updated:'Updated',
    days:'days', today:'Today', expiredBy:'days overdue', expiresIn:'days left', unknown:'No date',
    filter:'Filter', language:'Language', darkMode:'Switch to dark mode', lightMode:'Switch to light mode', backup:'Backup / restore', export:'Export JSON',
    import:'Import JSON', importHint:'Import replaces the current data on this browser. Export a backup first.',
    close:'Close', noHistory:'No history yet', deleteProductTitle:'Delete this product?', deleteProductBody:'This will remove the product and its expiration history. You can restore it for a short time using Undo.', confirmDeleteAction:'Yes, delete product', scanTitle:'Scan a barcode', scanHint:'Hold the barcode anywhere in the frame. Horizontal, vertical, or diagonal is fine.',
    manual:'Enter barcode manually', useBarcode:'Use barcode', cameraError:'Camera access or barcode scanning is unavailable. Check browser permissions or enter the barcode manually.', photoError:'Could not process that image. Try another photo.',
    cameraPermission:'Allow camera access to scan a bottle barcode.', confirmDelete:'Delete this product and its history?',
    delete:'Delete', productSaved:'Product saved', selectPhoto:'Choose image', required:'Please enter a product name.',
    noExpiry:'No expiration date', back:'Back to inventory',
    recent:'Recent activity', noActivity:'Your recent updates will appear here.', dateAdded:'Date recorded',
    datesRecorded:'Dates recorded', addFirstDate:'Add the first expiration date', productsCount:'products',
    localOnly:'Local device storage', localNotice:'Data is stored in this browser. Export JSON to back it up or move it to another device.',
    removePhoto:'Remove photo', changePhoto:'Change photo', allDates:'All dates', clearSearch:'Clear search',
    overwriteTitle:'Replace current data?', overwriteBody:'This will replace the data saved in this browser. Continue only if this is intentional.',
    imported:'Data imported successfully', invalidFile:'That file is not a valid BottleTrack backup.', languageName:'English',
    noBarcode:'No barcode', scanUnsupported:'Barcode scanning is not supported in this browser. Type the barcode instead.',
    duplicate:'This barcode is already in your inventory.', open:'Open product',
    duplicatePrompt:'What would you like to do with the existing barcode?', editExisting:'Edit existing product', createAnother:'Create another product',
    undo:'Undo', productDeleted:'Product deleted.', productRestored:'Product restored.', sharedInventory:'Shared inventory', syncLoading:'Connecting to shared inventory…', syncError:'Could not sync. Showing this browser’s saved data.',
    sharedNotice:'Anyone with the site link can view and change this inventory. Export backups regularly.', saveError:'Could not save the product. Please try again.',
    storageError:'Browser storage is full. Export a backup and remove a large photo.',
    productPhoto:'Product image', photoTooLarge:'Choose a smaller photo for reliable mobile viewing.', addNewDate:'Record a new expiration date',
    dateRequired:'Choose an expiration date.', saveChanges:'Save changes', product:'Product', optional:'Optional',
    currentStock:'Current stock', deleteDateEntry:'Remove date entry', sureDateEntry:'Remove this expiration entry?',
    date:'Date', source:'Entry', newProduct:'New product', editProduct:'Edit product', productCatalog:'Product catalog',
    expirySummary:'Expiration overview', noMatches:'No products match these filters.', languageChanged:'Language',
    installApp:'Add to device', installHelpTitle:'Add BottleTrack to your device', installHelp:'On iPhone or iPad: tap Share, then choose “Add to Home Screen”. On Android: open your browser menu and choose “Install app” or “Add to Home screen”.', within30Days:'≤ 30 days'
  },
  he: {
    app:'BottleTrack', branchLabel:'בנה משקאות · סניף שדרות', photoProcessing:'מכינים את התמונה…', tagline:'המלאי שלך. בתוקף. בשליטה.', overview:'סקירה כללית', inventory:'מלאי',
    expiring:'עומדים לפוג', expired:'פגי תוקף', products:'מוצרים', tracked:'מוצרים במעקב',
    search:'חיפוש לפי שם או ברקוד…', scan:'סריקת ברקוד', add:'הוספת מוצר', addLot:'הוספת תאריך תפוגה',
    all:'כל המוצרים', ok:'בתוקף', soon:'עומדים לפוג', overdue:'פג תוקף', noProducts:'עדיין אין מוצרים',
    noProductsHint:'סרקו בקבוק או הוסיפו מוצר ראשון כדי לעקוב אחר תאריכי תפוגה.',
    barcode:'ברקוד', name:'שם המוצר', size:'גודל הבקבוק (לא חובה)', size330:'330 מ״ל', size500:'500 מ״ל', size750:'750 מ״ל', size1500:'1.5 ליטר', sizeCan:'פחית', size500Can:'פחית 500 מ״ל',
    expiry:'תאריך תפוגה', photo:'תמונת מוצר (לא חובה)',
    save:'שמירת מוצר', saveLot:'שמירת תאריך', cancel:'ביטול', edit:'עריכה', history:'היסטוריה',
    details:'פרטי מוצר', dateHistory:'היסטוריית תאריכי תפוגה',
    latestExpiry:'תפוגה קרובה', added:'נוסף', updated:'עודכן',
    days:'ימים', today:'היום', expiredBy:'ימים לאחר התפוגה', expiresIn:'ימים נותרו', unknown:'אין תאריך',
    filter:'סינון', language:'שפה', darkMode:'מעבר למצב כהה', lightMode:'מעבר למצב בהיר', backup:'גיבוי / שחזור', export:'ייצוא JSON',
    import:'ייבוא JSON', importHint:'הייבוא מחליף את הנתונים בדפדפן הזה. מומלץ לייצא גיבוי קודם.',
    close:'סגירה', noHistory:'אין עדיין היסטוריה', deleteProductTitle:'למחוק את המוצר?', deleteProductBody:'המוצר והיסטוריית התפוגה שלו יוסרו. אפשר לשחזר אותם לזמן קצר באמצעות „ביטול”.', confirmDeleteAction:'כן, למחוק את המוצר', scanTitle:'סריקת ברקוד', scanHint:'החזיקו את הברקוד בכל זווית בתוך המסגרת. אופקי, אנכי או אלכסוני — הכול מתאים.',
    manual:'הזנת ברקוד ידנית', useBarcode:'שימוש בברקוד', cameraError:'אין אפשרות להשתמש במצלמה או בסריקה. בדקו הרשאות או הזינו ברקוד ידנית.', photoError:'לא ניתן לעבד את התמונה. נסו לבחור תמונה אחרת.',
    cameraPermission:'יש לאפשר גישה למצלמה כדי לסרוק ברקוד.', confirmDelete:'למחוק את המוצר ואת ההיסטוריה שלו?',
    delete:'מחיקה', productSaved:'המוצר נשמר', selectPhoto:'בחירת תמונה', required:'נא להזין שם מוצר.',
    noExpiry:'אין תאריך תפוגה', back:'חזרה למלאי',
    recent:'פעילות אחרונה', noActivity:'עדכונים אחרונים יופיעו כאן.', dateAdded:'תאריך רישום',
    datesRecorded:'תאריכים שנרשמו', addFirstDate:'הוספת תאריך התפוגה הראשון', productsCount:'מוצרים',
    localOnly:'אחסון במכשיר', localNotice:'הנתונים נשמרים בדפדפן הזה. ייצאו JSON לגיבוי או להעברה למכשיר אחר.',
    removePhoto:'הסרת תמונה', changePhoto:'החלפת תמונה', allDates:'כל התאריכים', clearSearch:'ניקוי חיפוש',
    overwriteTitle:'להחליף את הנתונים הקיימים?', overwriteBody:'פעולה זו תחליף את הנתונים בדפדפן. המשיכו רק אם זו הכוונה.',
    imported:'הנתונים יובאו בהצלחה', invalidFile:'זה אינו קובץ גיבוי תקין של BottleTrack.', languageName:'עברית',
    noBarcode:'ללא ברקוד', scanUnsupported:'הדפדפן אינו תומך בסריקת ברקוד. הזינו את הברקוד ידנית.',
    duplicate:'הברקוד הזה כבר קיים במלאי.', open:'פתיחת מוצר',
    duplicatePrompt:'מה תרצו לעשות עם הברקוד הקיים?', editExisting:'עריכת המוצר הקיים', createAnother:'יצירת מוצר נוסף',
    undo:'ביטול', productDeleted:'המוצר נמחק.', productRestored:'המוצר שוחזר.', sharedInventory:'מלאי משותף', syncLoading:'מתחבר למלאי המשותף…', syncError:'הסנכרון נכשל. מוצגים הנתונים השמורים בדפדפן הזה.',
    sharedNotice:'כל מי שיש לו קישור לאתר יכול לצפות ולשנות את המלאי. ייצאו גיבויים באופן קבוע.', saveError:'לא ניתן לשמור את המוצר. נסו שוב.',
    storageError:'האחסון בדפדפן מלא. ייצאו גיבוי והסירו תמונה גדולה.',
    productPhoto:'תמונת מוצר', photoTooLarge:'בחרו תמונה קטנה יותר לצפייה אמינה בנייד.', addNewDate:'רישום תאריך תפוגה חדש',
    dateRequired:'יש לבחור תאריך תפוגה.', saveChanges:'שמירת שינויים', product:'מוצר', optional:'לא חובה',
    currentStock:'מלאי נוכחי', deleteDateEntry:'הסרת תאריך', sureDateEntry:'להסיר את רישום התפוגה הזה?',
    date:'תאריך', source:'רישום', newProduct:'מוצר חדש', editProduct:'עריכת מוצר', productCatalog:'קטלוג מוצרים',
    expirySummary:'סקירת תפוגות', noMatches:'אין מוצרים התואמים לסינון.', languageChanged:'שפה',
    installApp:'הוספה למכשיר', installHelpTitle:'הוספת BottleTrack למכשיר', installHelp:'ב-iPhone או iPad: הקישו על שיתוף ואז על „הוספה למסך הבית”. ב-Android: פתחו את תפריט הדפדפן ובחרו „התקנת אפליקציה” או „הוספה למסך הבית”.', within30Days:'עד 30 יום'
  },
  ru: {
    app:'BottleTrack', branchLabel:'Bana Mashkaot · филиал Сдерот', photoProcessing:'Подготовка фото…', tagline:'Ваш запас. Сроки под контролем.', overview:'Обзор', inventory:'Склад',
    expiring:'Скоро истекает', expired:'Просрочено', products:'Товары', tracked:'Товаров отслеживается',
    search:'Поиск по названию или штрихкоду…', scan:'Сканировать штрихкод', add:'Добавить товар', addLot:'Добавить срок годности',
    all:'Все товары', ok:'В сроке', soon:'Скоро истекает', overdue:'Просрочено', noProducts:'Пока нет товаров',
    noProductsHint:'Отсканируйте бутылку или добавьте первый товар, чтобы отслеживать сроки годности.',
    barcode:'Штрихкод', name:'Название товара', size:'Объём (необязательно)', size330:'330 мл', size500:'500 мл', size750:'750 мл', size1500:'1,5 л', sizeCan:'Банка', size500Can:'Банка 500 мл',
    expiry:'Срок годности', photo:'Фото товара (необязательно)',
    save:'Сохранить товар', saveLot:'Сохранить дату', cancel:'Отмена', edit:'Изменить', history:'История',
    details:'Информация о товаре', dateHistory:'История сроков годности',
    latestExpiry:'Ближайший срок', added:'Добавлено', updated:'Обновлено',
    days:'дней', today:'Сегодня', expiredBy:'дн. просрочено', expiresIn:'дн. осталось', unknown:'Нет даты',
    filter:'Фильтр', language:'Язык', darkMode:'Включить тёмную тему', lightMode:'Включить светлую тему', backup:'Резервная копия / восстановление', export:'Экспорт JSON',
    import:'Импорт JSON', importHint:'Импорт заменяет данные в этом браузере. Сначала сохраните резервную копию.',
    close:'Закрыть', noHistory:'Истории пока нет', deleteProductTitle:'Удалить этот товар?', deleteProductBody:'Товар и история сроков годности будут удалены. В течение короткого времени их можно восстановить кнопкой «Отменить».', confirmDeleteAction:'Да, удалить товар', scanTitle:'Сканирование штрихкода', scanHint:'Держите штрихкод в любой части рамки. Горизонтально, вертикально или по диагонали.',
    manual:'Ввести штрихкод вручную', useBarcode:'Использовать штрихкод', cameraError:'Камера или сканирование недоступны. Проверьте разрешения или введите штрихкод вручную.', photoError:'Не удалось обработать изображение. Попробуйте выбрать другое фото.',
    cameraPermission:'Разрешите доступ к камере для сканирования.', confirmDelete:'Удалить товар и всю его историю?',
    delete:'Удалить', productSaved:'Товар сохранён', selectPhoto:'Выбрать изображение', required:'Введите название товара.',
    noExpiry:'Нет срока годности', back:'Назад к складу',
    recent:'Последние действия', noActivity:'Последние обновления появятся здесь.', dateAdded:'Дата записи',
    datesRecorded:'Записанные даты', addFirstDate:'Добавить первый срок годности', productsCount:'товаров',
    localOnly:'Локальное хранилище', localNotice:'Данные хранятся в этом браузере. Экспортируйте JSON для резервной копии или переноса.',
    removePhoto:'Удалить фото', changePhoto:'Изменить фото', allDates:'Все даты', clearSearch:'Очистить поиск',
    overwriteTitle:'Заменить текущие данные?', overwriteBody:'Это заменит данные в браузере. Продолжайте, только если уверены.',
    imported:'Данные успешно импортированы', invalidFile:'Это недействительная резервная копия BottleTrack.', languageName:'Русский',
    noBarcode:'Нет штрихкода', scanUnsupported:'Этот браузер не поддерживает сканирование. Введите штрихкод вручную.',
    duplicate:'Этот штрихкод уже есть в запасе.', open:'Открыть товар',
    duplicatePrompt:'Что сделать с существующим штрихкодом?', editExisting:'Изменить товар', createAnother:'Создать ещё один товар',
    undo:'Отменить', productDeleted:'Товар удалён.', productRestored:'Товар восстановлен.', sharedInventory:'Общий склад', syncLoading:'Подключение к общему складу…', syncError:'Не удалось синхронизировать. Показаны данные этого браузера.',
    sharedNotice:'Любой, у кого есть ссылка на сайт, может просматривать и изменять склад. Регулярно сохраняйте резервные копии.', saveError:'Не удалось сохранить товар. Попробуйте ещё раз.',
    storageError:'Память браузера заполнена. Экспортируйте копию и удалите большое фото.',
    productPhoto:'Фото товара', photoTooLarge:'Выберите фото меньшего размера для надёжного просмотра на телефоне.', addNewDate:'Записать новый срок годности',
    dateRequired:'Укажите срок годности.', saveChanges:'Сохранить изменения', product:'Товар', optional:'Необязательно',
    currentStock:'Текущий запас', deleteDateEntry:'Удалить запись даты', sureDateEntry:'Удалить эту запись срока годности?',
    date:'Дата', source:'Запись', newProduct:'Новый товар', editProduct:'Изменить товар', productCatalog:'Каталог товаров',
    expirySummary:'Обзор сроков годности', noMatches:'Нет товаров, соответствующих фильтрам.', languageChanged:'Язык',
    installApp:'На устройство', installHelpTitle:'Добавить BottleTrack на устройство', installHelp:'На iPhone или iPad: нажмите «Поделиться», затем «На экран Домой». На Android: откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».', within30Days:'≤ 30 дней'
  }
};
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const readDB = () => { try { return normalizeDatabase(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return emptyDB; } };
const daysUntil = d => d ? Math.ceil((new Date(d+'T00:00:00') - new Date(today()+'T00:00:00')) / 86400000) : null;
const statusFor = d => { const n=daysUntil(d); if(n===null)return 'unknown'; if(n<0)return 'expired'; if(n<=30)return 'soon'; return 'ok'; };
const fmtDate = (d, lang) => d ? new Intl.DateTimeFormat(lang==='he'?'he-IL':lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00')) : '—';
const sizeLabel = (size, t) => ({'330ml':t.size330,'500ml':t.size500,'750ml':t.size750,'1.5l':t.size1500,can:t.sizeCan,'500ml-can':t.size500Can}[size]||size||'');

function App(){
  const [db,setDb]=useState(readDB);
  const [lang,setLang]=useState(()=>localStorage.getItem(LANG_KEY)||'he');
  const [theme,setTheme]=useState(()=>localStorage.getItem(THEME_KEY)==='dark'?'dark':'light');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [view,setView]=useState('inventory');
  const [selected,setSelected]=useState(null);
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState('');
  const [toastUndo,setToastUndo]=useState(false);
  const [deletedProduct,setDeletedProduct]=useState(null);
  const [productToDelete,setProductToDelete]=useState(null);
  const [duplicateProduct,setDuplicateProduct]=useState(null);
  const [syncStatus,setSyncStatus]=useState(sharedStorageEnabled?'loading':'local');
  const [syncReady,setSyncReady]=useState(false);
  const [storageError,setStorageError]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [installPrompt,setInstallPrompt]=useState(null);
  const [isInstalled,setIsInstalled]=useState(false);
  const [scanValue,setScanValue]=useState('');
  const [photoProcessing,setPhotoProcessing]=useState(false);
  const [scanError,setScanError]=useState('');
  const [cameraOn,setCameraOn]=useState(false);
  const [form,setForm]=useState(null);
  const [lotForm,setLotForm]=useState({expiry:''});
  const videoRef=useRef(null), scannerControlsRef=useRef(null), fileRef=useRef(null), importRef=useRef(null), scanLoop=useRef(false), lastSyncedJson=useRef(null), pendingLocalWrite=useRef(false);
  const t=messages[lang]||messages.en, rtl=lang==='he';
  useEffect(()=>{ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(db));setStorageError(false);}catch(error){console.error('Could not save local inventory:',error);setStorageError(true);} },[db]);
  useEffect(()=>{localStorage.setItem(LANG_KEY,lang); document.documentElement.lang=lang;document.documentElement.dir=rtl?'rtl':'ltr';},[lang,rtl]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);},[theme]);
  useEffect(()=>{
    const onInstallPrompt=event=>{event.preventDefault();setInstallPrompt(event)};
    const onInstalled=()=>{setIsInstalled(true);setInstallPrompt(null)};
    setIsInstalled(window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true);
    window.addEventListener('beforeinstallprompt',onInstallPrompt);
    window.addEventListener('appinstalled',onInstalled);
    return()=>{window.removeEventListener('beforeinstallprompt',onInstallPrompt);window.removeEventListener('appinstalled',onInstalled)};
  },[]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>{setToast('');setToastUndo(false);setDeletedProduct(null)},5000);return()=>clearTimeout(id)},[toast]);
  useEffect(()=>()=>stopCamera(),[]);
  useEffect(()=>{
    let active=true;
    if(!sharedStorageEnabled){setSyncReady(true);return()=>{active=false}};
    (async()=>{
      try{
        let row=await fetchSharedDatabase();
        if(!row){await initializeSharedDatabase(readDB());row=await fetchSharedDatabase();}
        if(row?.data&&Array.isArray(row.data.products)){
          lastSyncedJson.current=JSON.stringify(row.data);
          if(active){setDb(normalizeDatabase(row.data));setSyncStatus('shared')}
        }else if(active)setSyncStatus('error');
      }catch{if(active)setSyncStatus('error')}
      finally{if(active)setSyncReady(true)}
    })();
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!sharedStorageEnabled||!syncReady||syncStatus!=='shared')return;
    const payload=JSON.stringify(db);
    if(payload===lastSyncedJson.current)return;
    pendingLocalWrite.current=true;
    const timer=setTimeout(async()=>{
      try{await saveSharedDatabase(db);lastSyncedJson.current=payload;pendingLocalWrite.current=false;setSyncStatus('shared')}
      catch{setSyncStatus('error')}
    },250);
    return()=>clearTimeout(timer);
  },[db,syncReady,syncStatus]);
  useEffect(()=>{
    if(!sharedStorageEnabled||!syncReady||syncStatus!=='shared')return;
    const timer=setInterval(async()=>{
      if(pendingLocalWrite.current)return;
      try{
        const row=await fetchSharedDatabase();
        if(!row?.data)return;
        const payload=JSON.stringify(row.data);
        if(payload!==lastSyncedJson.current){lastSyncedJson.current=payload;const normalized=normalizeDatabase(row.data);setDb(current=>JSON.stringify(current)===JSON.stringify(normalized)?current:normalized)}
      }catch{setSyncStatus('error')}
    },4000);
    return()=>clearInterval(timer);
  },[syncReady,syncStatus]);
  const products=db.products;
  const enriched=useMemo(()=>products.map(p=>({...p,sortedLots:[...(p.lots||[])].sort((a,b)=>a.expiry.localeCompare(b.expiry)),nextLot:[...(p.lots||[])].filter(x=>x.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry)).find(x=>x.expiry>=today())||[...(p.lots||[])].filter(x=>x.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]})),[products]);
  const filtered=enriched.filter(p=>{
    const q=query.trim().toLowerCase();
    const match=!q||[p.name,p.barcode].some(x=>(x||'').toLowerCase().includes(q));
    const s=p.nextLot?statusFor(p.nextLot.expiry):'unknown';
    return match&&(filter==='all'||filter===s);
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const soonCount=enriched.filter(p=>p.nextLot&&statusFor(p.nextLot.expiry)==='soon').length;
  const expiredCount=enriched.filter(p=>p.nextLot&&statusFor(p.nextLot.expiry)==='expired').length;
  const selectMetricFilter=value=>{setFilter(value);setView('inventory');setMobileMenu(false)};
  const log=(type,product,detail='')=>setDb(prev=>({...prev,activity:[{id:uid(),type,product:product?.name||'',barcode:product?.barcode||'',detail,at:new Date().toISOString()},...(prev.activity||[])].slice(0,100)}));
  const notify=s=>{setToast(s);setToastUndo(false);setDeletedProduct(null)};
  function stopCamera(){
    scanLoop.current=false;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current=null;
    setCameraOn(false);
  }
  async function startCamera(){
    setScanError('');
    if(!navigator.mediaDevices?.getUserMedia){setScanError(t.cameraError);return;}
    try{
      scanLoop.current=true;
      setCameraOn(true);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const video=videoRef.current;
      if(!video)throw new Error('Scanner preview is unavailable.');
      const [{BrowserMultiFormatReader},{DecodeHintType}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
      const reader=new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER,true]]));
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(!scanLoop.current){stream.getTracks().forEach(track=>track.stop());return;}
      let scanTimer;
      const stop=()=>{clearTimeout(scanTimer);stream.getTracks().forEach(track=>track.stop());if(video.srcObject===stream)video.srcObject=null;};
      scannerControlsRef.current={stop};
      video.srcObject=stream;
      await video.play();
      const canvas=document.createElement('canvas');
      const angles=[0,45,90,135];
      let angleIndex=0;
      const scanFrame=()=>{
        if(!scanLoop.current||!video.videoWidth)return;
        const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
        const width=Math.round(video.videoWidth*scale),height=Math.round(video.videoHeight*scale);
        const angle=angles[angleIndex++%angles.length]*Math.PI/180;
        const cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
        canvas.width=Math.ceil(width*cos+height*sin);
        canvas.height=Math.ceil(width*sin+height*cos);
        const context=canvas.getContext('2d');
        context.translate(canvas.width/2,canvas.height/2);
        context.rotate(angle);
        context.drawImage(video,-width/2,-height/2,width,height);
        try{
          const result=reader.decodeFromCanvas(canvas);
          if(result){setScanValue(result.getText());stopCamera();return;}
        }catch{/* Keep cycling through orientations until a barcode is found. */}
        scanTimer=window.setTimeout(scanFrame,70);
      };
      scanFrame();
    }catch{setScanError(t.cameraError);stopCamera();}
  }
  function openScanner(){setScanValue('');setScanError('');setModal('scanner');}
  function handleBarcode(code){
    const barcode=(code||'').trim(); if(!barcode){setModal('form');setForm(newProductForm(''));return;}
    const found=products.find(p=>p.barcode===barcode);
    if(found){stopCamera();setDuplicateProduct(found);setModal('duplicate');return;}
    setModal('form');setForm(newProductForm(barcode));
  }
  function newProductForm(barcode=''){return {id:null,barcode,name:'',size:'',photo:'',expiry:''};}
  function openNew(){setPhotoProcessing(false);setForm(newProductForm(''));setModal('form');}
  function openEdit(p){setPhotoProcessing(false);setForm({id:p.id,barcode:p.barcode||'',name:p.name||'',size:p.size||'',photo:p.photo||'',expiry:''});setModal('form');}
  function saveProduct(e){
    e?.preventDefault();if(photoProcessing)return;if(!form?.name?.trim()){notify(t.required);return;}
    try{
      if(form?.id){
        const old=products.find(p=>p.id===form.id);if(!old)throw new Error(t.required);
        const updated=updateProduct(old,form,{now:()=>new Date().toISOString(),lotId:uid});
        setDb(prev=>({...prev,products:prev.products.map(p=>p.id===form.id?updated:p)}));log('updated',updated);setSelected(updated.id);setView('detail');
      }else{
        const p=createProduct(form,{id:uid,lotId:uid,now:()=>new Date().toISOString()});
        setDb(prev=>({...prev,products:[p,...prev.products]}));log('created',p);setSelected(p.id);setView('detail');
      }
    }catch(error){console.error('Could not save product:',error);notify(t.saveError);return;}
    setModal(null);notify(t.productSaved);
  }
  function addLot(e){
    e?.preventDefault();if(!lotForm.expiry){notify(t.dateRequired);return;}
    const p=products.find(x=>x.id===selected);if(!p)return;
    const lot={id:uid(),expiry:lotForm.expiry,createdAt:new Date().toISOString()};
    const updated={...p,lots:[lot,...(p.lots||[])],updatedAt:new Date().toISOString()};
    setDb(prev=>({...prev,products:prev.products.map(x=>x.id===selected?updated:x)}));log('lot-added',updated,fmtDate(lot.expiry,lang));
    setLotForm({expiry:''});setModal(null);notify(t.productSaved);
  }
  function deleteProduct(p){if(!p)return;setProductToDelete(p);setModal('delete-product');}
  function confirmProductDelete(){const p=productToDelete;if(!p)return;setDb(prev=>({...prev,products:prev.products.filter(x=>x.id!==p.id)}));log('deleted',p);setDeletedProduct(p);setToastUndo(true);setToast(t.productDeleted);setView('inventory');setSelected(null);setProductToDelete(null);setModal(null);}
  function undoDelete(){if(!deletedProduct)return;setDb(prev=>prev.products.some(p=>p.id===deletedProduct.id)?prev:{...prev,products:[deletedProduct,...prev.products]});setDeletedProduct(null);setToastUndo(false);setToast(t.productRestored);}
  function deleteLot(lot){if(!confirm(t.sureDateEntry))return;const p=products.find(x=>x.id===selected);if(!p)return;setDb(prev=>({...prev,products:prev.products.map(x=>x.id===p.id?{...x,lots:x.lots.filter(l=>l.id!==lot.id)}:x)}));}
  function exportJSON(){const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString(),schemaVersion:1},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`bottletrack-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);}
  function importJSON(e){const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(reader.result);if(!Array.isArray(value.products)||!Array.isArray(value.activity||[]))throw Error();if(confirm(t.overwriteTitle+'\n'+t.overwriteBody)){setDb(normalizeDatabase(value));setView('inventory');setSelected(null);notify(t.imported);}}catch{notify(t.invalidFile);}e.target.value='';};reader.readAsText(file);}
  async function photoChange(e){const input=e.target;const f=input.files?.[0];if(!f)return;if(photoProcessing){input.value='';return;}setPhotoProcessing(true);try{const photo=await compressProductPhoto(f);setForm(v=>({...v,photo}));}catch(error){console.error('Could not process product photo:',error);notify(error?.code==='PHOTO_TOO_LARGE'?t.photoTooLarge:t.photoError);}finally{input.value='';setPhotoProcessing(false);}}
  const selectedProduct=enriched.find(p=>p.id===selected);
  const statusLabel=s=>s==='expired'?t.overdue:s==='soon'?t.soon:s==='ok'?t.ok:t.unknown;
  const StatusPill=({status})=><span className={`status status-${status}`}>{status==='expired'?<AlertTriangle size={13}/>:status==='soon'?<Clock3 size={13}/>:status==='ok'?<CheckCircle2 size={13}/>:<CalendarClock size={13}/>} {statusLabel(status)}</span>;
  const goInventory=()=>{setView('inventory');setSelected(null);setMobileMenu(false)};
  const goHome=()=>{setView('inventory');setSelected(null);setFilter('all');setQuery('');setMobileMenu(false)};
  const addToDevice=async()=>{if(!installPrompt){setModal('install-help');return}await installPrompt.prompt();setInstallPrompt(null)};
  return <div className={`app ${rtl?'rtl':''}`}>
    <aside className={`sidebar ${mobileMenu?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><img src="./bottletrack-icon.svg" alt=""/></div><div><strong>{t.app}</strong><span>{t.branchLabel}</span></div><button type="button" className="icon-btn sidebar-close" onClick={()=>setMobileMenu(false)} aria-label={t.close} title={t.close}><X size={20}/></button></div>
      <div className="nav-label">{t.overview}</div>
      <button className={`nav-item ${view==='inventory'?'active':''}`} onClick={goInventory}><Package size={18}/><span>{t.inventory}</span><span className="nav-count">{products.length}</span></button>
      <button className={`nav-item ${view==='expiring'?'active':''}`} onClick={()=>{setFilter('soon');setView('inventory');setMobileMenu(false)}}><Clock3 size={18}/><span>{t.expiring}</span>{soonCount>0&&<span className="nav-count warn">{soonCount}</span>}</button>
      <button className={`nav-item ${view==='expired'?'active':''}`} onClick={()=>{setFilter('expired');setView('inventory');setMobileMenu(false)}}><AlertTriangle size={18}/><span>{t.expired}</span>{expiredCount>0&&<span className="nav-count danger">{expiredCount}</span>}</button>
      <div className="sidebar-bottom">
        <div className="local-note"><div className="local-note-icon"><CircleHelp size={17}/></div><div><b>{syncStatus==='shared'?t.sharedInventory:t.localOnly}</b><p>{storageError?t.storageError:syncStatus==='error'?t.syncError:syncStatus==='shared'?t.sharedNotice:t.localNotice}</p></div></div>
        <div className="backup-actions"><button onClick={exportJSON}><Download size={16}/>{t.export}</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/>{t.import}</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJSON}/></div>
        <div className="lang-picker"><Languages size={17}/><label className="lang-select-wrap"><select aria-label={t.language} value={lang} onChange={e=>setLang(e.target.value)}><option value="he">עברית</option><option value="en">English</option><option value="ru">Русский</option></select><ChevronDown className="lang-chevron" size={14}/></label><button type="button" className="theme-toggle" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} aria-label={theme==='dark'?t.lightMode:t.darkMode} title={theme==='dark'?t.lightMode:t.darkMode}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button></div>
      </div>
    </aside>
    {mobileMenu&&<button type="button" className="sidebar-scrim" onClick={()=>setMobileMenu(false)} aria-label={t.close}/>}
    <main className="main">
      <header className="topbar"><div className="topbar-context"><button className="icon-btn mobile-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu"><Menu/></button><div className="breadcrumb">{t.productCatalog}<span>/</span><b>{view==='detail'?selectedProduct?.name||t.details:view==='inventory'?t.inventory:t.expirySummary}</b></div></div><button type="button" className="topbar-home" onClick={goHome} aria-label={`${t.app} — ${t.inventory}`} title={t.inventory}><span className="brand-mark"><img src="./bottletrack-icon.svg" alt=""/></span><span className="topbar-brand-text"><strong>{t.app}</strong></span></button><div className="top-actions"><span className={`storage-dot ${syncStatus==='error'||storageError?'sync-error':''}`}></span><span className="storage-label">{storageError?t.storageError:syncStatus==='loading'?t.syncLoading:syncStatus==='shared'?t.sharedInventory:syncStatus==='error'?t.syncError:t.localOnly}</span>{!isInstalled&&<button className="button secondary install-button" onClick={addToDevice} aria-label={t.installApp} title={t.installApp}><Download size={16}/><span>{t.installApp}</span></button>}<button className="button primary top-add" onClick={openNew}><Plus size={17}/>{t.add}</button></div></header>
      {view==='detail'&&selectedProduct ? <section className="content detail-content">
        <button className="back-link" onClick={goInventory}>← {t.back}</button>
        <div className="detail-header"><div className="detail-identity">{isDisplayableProductPhoto(selectedProduct.photo)?<img className="detail-photo" src={selectedProduct.photo} alt={selectedProduct.name}/>:<div className="detail-photo placeholder"><Wine size={34}/></div>}<div><div className="eyebrow">{t.details}</div><h1>{selectedProduct.name}</h1>{selectedProduct.size&&<span className="product-size-label">{sizeLabel(selectedProduct.size,t)}</span>}<div className="subline"><Barcode size={15}/>{selectedProduct.barcode||t.noBarcode}</div></div></div><div className="detail-actions"><button className="button secondary" onClick={()=>openEdit(selectedProduct)}><Pencil size={16}/>{t.edit}</button><button className="button primary" onClick={()=>{setLotForm({expiry:''});setModal('lot')}}><Plus size={17}/>{t.addLot}</button></div></div>
        <div className="stats-row"><div className="stat-card"><span>{t.latestExpiry}</span><strong>{selectedProduct.nextLot?fmtDate(selectedProduct.nextLot.expiry,lang):t.unknown}</strong>{selectedProduct.nextLot&&<small><StatusPill status={statusFor(selectedProduct.nextLot.expiry)}/></small>}</div><div className="stat-card"><span>{t.datesRecorded}</span><strong>{(selectedProduct.lots||[]).length}</strong><small>{t.dateHistory}</small></div></div>
        <div className="detail-grid"><section className="panel"><div className="panel-heading"><div><h2><CalendarClock size={19}/>{t.dateHistory}</h2><p>{t.datesRecorded}</p></div><button className="small-action" onClick={()=>{setLotForm({expiry:''});setModal('lot')}}><Plus size={15}/>{t.addLot}</button></div>
          {selectedProduct.sortedLots?.length?<div className="timeline">{selectedProduct.sortedLots.map(lot=><div className="timeline-row" key={lot.id}><div className={`timeline-dot ${statusFor(lot.expiry)}`}></div><div className="timeline-main"><strong>{fmtDate(lot.expiry,lang)}</strong><span>{t.dateAdded}: {fmtDate((lot.createdAt||'').slice(0,10),lang)}</span></div><StatusPill status={statusFor(lot.expiry)}/><button className="icon-btn subtle" title={t.deleteDateEntry} onClick={()=>deleteLot(lot)}><Trash2 size={15}/></button></div>)}</div>:<div className="empty-small"><CalendarDays size={25}/><p>{t.noHistory}</p><button className="text-button" onClick={()=>setModal('lot')}>{t.addFirstDate}</button></div>}
          <div className="panel-footer"><button className="delete-button" onClick={()=>deleteProduct(selectedProduct)}><Trash2 size={15}/>{t.delete}</button></div>
        </section></div>
      </section>:<section className="content">
        <div className="page-heading"><div><div className="eyebrow">{t.overview}</div><h1>{t.inventory}</h1><p>{t.tagline}</p></div></div>
        <div className="metric-grid">
          <button type="button" className={`metric ${filter==='all'?'metric-active':''}`} onClick={()=>selectMetricFilter('all')} aria-pressed={filter==='all'}><div className="metric-top"><span>{t.tracked}</span><div className="metric-icon green"><Package size={18}/></div></div><strong>{products.length}</strong><small>{t.productsCount}</small></button>
          <button type="button" className={`metric ${filter==='soon'?'metric-active':''}`} onClick={()=>selectMetricFilter('soon')} aria-pressed={filter==='soon'}><div className="metric-top"><span>{t.expiring}</span><div className="metric-icon amber metric-icon-window"><Clock3 size={18}/><span>30</span></div></div><strong>{soonCount}</strong><small className="metric-window-label">{t.within30Days}</small></button>
          <button type="button" className={`metric ${filter==='expired'?'metric-active':''}`} onClick={()=>selectMetricFilter('expired')} aria-pressed={filter==='expired'}><div className="metric-top"><span>{t.expired}</span><div className="metric-icon red"><AlertTriangle size={18}/></div></div><strong>{expiredCount}</strong><small>{t.overdue}</small></button>
        </div>
        <section className="inventory-panel">
          <div className="inventory-toolbar"><div><h2>{t.productCatalog}</h2><p>{filtered.length} {t.productsCount}</p></div><div className="toolbar-controls"><label className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/>{query&&<button onClick={()=>setQuery('')} aria-label={t.clearSearch}><X size={15}/></button>}</label><label className="filterbox"><Filter size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t.all}</option><option value="ok">{t.ok}</option><option value="soon">{t.soon}</option><option value="expired">{t.overdue}</option><option value="unknown">{t.unknown}</option></select></label></div></div>
          {filtered.length? <div className="product-list">{filtered.map(p=>{const s=p.nextLot?statusFor(p.nextLot.expiry):'unknown';return <button className="product-row" key={p.id} onClick={()=>{setSelected(p.id);setView('detail');setMobileMenu(false)}}><div className="product-thumb">{isDisplayableProductPhoto(p.photo)?<img src={p.photo} alt=""/>:<Wine size={22}/>}</div><div className="product-main"><strong>{p.name}</strong>{p.size&&<span className="product-size-label">{sizeLabel(p.size,t)}</span>}<span className="product-barcode">{p.barcode||t.noBarcode}</span></div><div className="product-expiry"><span>{t.latestExpiry}</span><strong>{p.nextLot?fmtDate(p.nextLot.expiry,lang):t.unknown}</strong></div><div className="product-status"><StatusPill status={s}/>{p.nextLot&&<small>{daysUntil(p.nextLot.expiry)===0?t.today:daysUntil(p.nextLot.expiry)<0?`${Math.abs(daysUntil(p.nextLot.expiry))} ${t.expiredBy}`:`${daysUntil(p.nextLot.expiry)} ${t.expiresIn}`}</small>}</div><ArrowUpRight className="row-arrow" size={17}/></button>})}</div>:<div className="empty-state"><div className="empty-illustration"><ScanLine size={34}/></div><h3>{query||filter!=='all'?t.noMatches:t.noProducts}</h3><p>{t.noProductsHint}</p><div className="empty-actions"><button className="button primary" onClick={openScanner}><ScanLine size={17}/>{t.scan}</button><button className="button secondary" onClick={openNew}><Plus size={17}/>{t.add}</button></div></div>}
        </section>
        <div className="bottom-tip"><div className="tip-icon"><CircleHelp size={17}/></div><p><strong>{syncStatus==='shared'?t.sharedInventory:t.localOnly}</strong> — {storageError?t.storageError:syncStatus==='error'?t.syncError:syncStatus==='shared'?t.sharedNotice:t.localNotice}</p><button onClick={exportJSON}>{t.export}<Download size={15}/></button></div>
      </section>}
    </main>
    {modal==='delete-product'&&productToDelete&&<div className="modal-backdrop" onKeyDown={e=>e.key==='Escape'&&(setProductToDelete(null),setModal(null))} onMouseDown={e=>e.target===e.currentTarget&&(setProductToDelete(null),setModal(null))}><div className="modal confirm-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-product-title" aria-describedby="delete-product-description"><div className="modal-heading"><div><div className="eyebrow">{t.delete}</div><h2 id="delete-product-title">{t.deleteProductTitle}</h2></div><button className="icon-btn" onClick={()=>{setProductToDelete(null);setModal(null)}} aria-label={t.close}><X/></button></div><div className="delete-confirm-product"><span className="delete-confirm-icon"><AlertTriangle size={21}/></span><strong>{productToDelete.name}</strong></div><p id="delete-product-description" className="modal-description">{t.deleteProductBody}</p><div className="modal-footer"><button type="button" className="button secondary" autoFocus onClick={()=>{setProductToDelete(null);setModal(null)}}>{t.cancel}</button><button type="button" className="button danger" onClick={confirmProductDelete}><Trash2 size={16}/>{t.confirmDeleteAction}</button></div></div></div>}
    {modal==='duplicate'&&duplicateProduct&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal duplicate-modal"><div className="modal-heading"><div><div className="eyebrow">{t.barcode}</div><h2>{t.duplicate}</h2></div><button className="icon-btn" onClick={()=>setModal(null)} aria-label={t.close}><X/></button></div><div className="duplicate-summary"><span>{duplicateProduct.name}</span><code>{duplicateProduct.barcode}</code></div><p className="modal-description">{t.duplicatePrompt}</p><div className="duplicate-actions"><button className="button secondary" onClick={()=>{const p=duplicateProduct;setDuplicateProduct(null);openEdit(p)}}><Pencil size={16}/>{t.editExisting}</button><button className="button primary" onClick={()=>{const barcode=duplicateProduct.barcode;setDuplicateProduct(null);setForm(newProductForm(barcode));setModal('form')}}><Plus size={16}/>{t.createAnother}</button></div></div></div>}
    {modal==='install-help'&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><div className="modal-heading"><div><div className="eyebrow">BottleTrack</div><h2 id="install-title">{t.installHelpTitle}</h2></div><button className="icon-btn" onClick={()=>setModal(null)} aria-label={t.close}><X/></button></div><p className="install-instructions">{t.installHelp}</p><div className="modal-footer"><button className="button primary" onClick={()=>setModal(null)}>{t.close}</button></div></div></div>}
    {modal==='form'&&form&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&!photoProcessing&&setModal(null)}><div className="modal form-modal"><div className="modal-heading"><div><div className="eyebrow">{form.id?t.editProduct:t.newProduct}</div><h2>{form.id?t.editProduct:t.add}</h2></div><button className="icon-btn" disabled={photoProcessing} onClick={()=>setModal(null)}><X/></button></div><form onSubmit={saveProduct}><div className="form-grid"><label className="field full"><span>{t.barcode}</span><div className="barcode-input"><Barcode size={18}/><input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} placeholder="7290000000000"/><button type="button" onClick={()=>{setModal('scanner');setScanValue(form.barcode||'')}} title={t.scan}><Camera size={17}/></button></div></label><label className="field full"><span>{t.name} *</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t.name}/></label><div className="field full size-field"><span>{t.size}</span><div className="size-options" role="group" aria-label={t.size}>{[['330ml',t.size330],['500ml',t.size500],['750ml',t.size750],['1.5l',t.size1500],['can',t.sizeCan],['500ml-can',t.size500Can]].map(([value,label])=><button key={value} type="button" className={form.size===value?'selected':''} aria-pressed={form.size===value} onClick={()=>setForm({...form,size:form.size===value?'':value})}>{label}</button>)}</div></div>
        <label className="field"><span>{t.expiry} ({t.optional})</span><input type="date" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})}/></label>
        <div className="field full"><span>{t.photo}</span><div className="photo-upload">{form.photo&&isDisplayableProductPhoto(form.photo)?<><img src={form.photo} alt={t.productPhoto}/><div><b>{t.productPhoto}</b><button type="button" className="text-button" onClick={()=>fileRef.current?.click()}>{t.changePhoto}</button><button type="button" className="text-button danger-text" onClick={()=>setForm({...form,photo:''})}>{t.removePhoto}</button></div></>:form.photo?<><div className="upload-placeholder"><Wine size={22}/><span>{t.photoTooLarge}</span></div><div><button type="button" className="text-button" onClick={()=>fileRef.current?.click()}>{t.changePhoto}</button><button type="button" className="text-button danger-text" onClick={()=>setForm({...form,photo:''})}>{t.removePhoto}</button></div></>:<button type="button" className="upload-placeholder" onClick={()=>fileRef.current?.click()}><ImagePlus size={22}/><span>{t.selectPhoto}</span></button>}<input ref={fileRef} hidden type="file" accept="image/*" onChange={photoChange}/></div></div>
      </div><div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setModal(null)} disabled={photoProcessing}>{t.cancel}</button><button type="submit" className="button primary" disabled={photoProcessing}><Save size={16}/>{photoProcessing?t.photoProcessing:form.id?t.saveChanges:t.save}</button></div></form></div></div>}
    {modal==='lot'&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal lot-modal"><div className="modal-heading"><div><div className="eyebrow">{selectedProduct?.name}</div><h2>{t.addNewDate}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><form onSubmit={addLot}><label className="field"><span>{t.expiry} *</span><input required type="date" value={lotForm.expiry} onChange={e=>setLotForm({...lotForm,expiry:e.target.value})}/></label><div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setModal(null)}>{t.cancel}</button><button className="button primary" type="submit"><Save size={16}/>{t.saveLot}</button></div></form></div></div>}
    {modal==='scanner'&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&(stopCamera(),setModal(null))}><div className="modal scanner-modal"><div className="modal-heading"><div><div className="eyebrow">{t.inventory}</div><h2><ScanLine size={22}/>{t.scanTitle}</h2></div><button className="icon-btn" onClick={()=>{stopCamera();setModal(null)}}><X/></button></div><p className="modal-description">{t.scanHint}</p><div className="scanner-view">{cameraOn?<><video ref={videoRef} muted playsInline/><div className="scan-frame"><span className="scan-angle"></span></div></>:<div className="scanner-placeholder"><Camera size={36}/><span>{t.cameraPermission}</span></div>}</div>{scanError&&<div className="inline-error">{scanError}</div>}<button className="button secondary camera-button" onClick={cameraOn?stopCamera:startCamera}><Camera size={17}/>{cameraOn?t.cancel:t.scan}</button><div className="manual-entry"><label className="field"><span>{t.manual}</span><input value={scanValue} onChange={e=>setScanValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(stopCamera(),handleBarcode(scanValue))} placeholder="7290000000000"/></label><button className="button primary" onClick={()=>{stopCamera();handleBarcode(scanValue)}}>{t.useBarcode}</button></div></div></div>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}{toastUndo&&<button className="toast-undo" onClick={undoDelete}>{t.undo}</button>}</div>}
  </div>
}

class AppErrorBoundary extends React.Component {
  state = { failed: false, message: '' };
  static getDerivedStateFromError(error) { return { failed: true, message: String(error?.message || error || 'Unknown rendering error').slice(0, 300) }; }
  componentDidCatch(error) { console.error('BottleTrack could not render the saved inventory:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 12, padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center', color: '#17251f' }}>
      <h1>BottleTrack couldn’t display this inventory</h1>
      <p>Your shared products are still saved. Reload the page to try again.</p>
      <code style={{ maxWidth: 'min(760px, 90vw)', overflowWrap: 'anywhere' }}>{this.state.message}</code>
      <button onClick={() => window.location.reload()} style={{ justifySelf: 'center', padding: '12px 20px' }}>Reload</button>
    </main>;
  }
}

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App/></AppErrorBoundary>);
