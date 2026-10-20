import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Barcode, Search, Plus, Package, CalendarClock, AlertTriangle, CheckCircle2,
  Clock3, History, Camera, ImagePlus, X, Download, Upload, Languages,
  ChevronDown, Trash2, Pencil, Filter, Menu, ArrowUpRight, Wine, CalendarDays,
  Save, ScanLine, CircleHelp, RotateCcw
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'bottletrack.data.v1';
const LANG_KEY = 'bottletrack.lang';
const today = () => new Date().toISOString().slice(0,10);
const emptyDB = { products: [], activity: [] };
const messages = {
  en: {
    app:'BottleTrack', tagline:'Your stock. In date. Under control.', overview:'Overview', inventory:'Inventory',
    expiring:'Expiring soon', expired:'Expired', products:'Products', tracked:'Tracked products',
    search:'Search name, barcode, description…', scan:'Scan barcode', add:'Add product', addLot:'Add date / batch',
    all:'All products', ok:'In date', soon:'Expiring soon', overdue:'Expired', noProducts:'No products yet',
    noProductsHint:'Scan a bottle or add your first product to start tracking dates and prices.',
    barcode:'Barcode', name:'Product name', description:'Description (optional)', price:'Bottle price',
    expiry:'Expiration date', batch:'Batch / note (optional)', photo:'Product photo (optional)',
    save:'Save product', saveLot:'Save batch', cancel:'Cancel', edit:'Edit', history:'History',
    details:'Product details', dateHistory:'Expiration history', priceHistory:'Price history',
    latestExpiry:'Next expiration', lastPrice:'Latest price', added:'Added', updated:'Updated',
    days:'days', today:'Today', expiredBy:'days overdue', expiresIn:'days left', unknown:'No date',
    filter:'Filter', language:'Language', backup:'Backup / restore', export:'Export JSON',
    import:'Import JSON', importHint:'Import replaces the current data on this browser. Export a backup first.',
    close:'Close', noHistory:'No history yet', scanTitle:'Scan a barcode', scanHint:'Point your camera at the barcode. If scanning is unavailable, enter it manually.',
    manual:'Enter barcode manually', useBarcode:'Use barcode', cameraError:'Camera access or barcode scanning is unavailable. Check browser permissions or enter the barcode manually.',
    cameraPermission:'Allow camera access to scan a bottle barcode.', confirmDelete:'Delete this product and its history?',
    delete:'Delete', productSaved:'Product saved', selectPhoto:'Choose image', required:'Please enter a product name.',
    noExpiry:'No expiration date', priceOptional:'Optional', back:'Back to inventory', notes:'Notes',
    recent:'Recent activity', noActivity:'Your recent updates will appear here.', dateAdded:'Date recorded',
    batches:'Recorded dates', priceLabel:'Price', addFirstDate:'Add the first expiration date', productsCount:'products',
    localOnly:'Local device storage', localNotice:'Data is stored in this browser. Export JSON to back it up or move it to another device.',
    removePhoto:'Remove photo', changePhoto:'Change photo', allDates:'All dates', clearSearch:'Clear search',
    overwriteTitle:'Replace current data?', overwriteBody:'This will replace the data saved in this browser. Continue only if this is intentional.',
    imported:'Data imported successfully', invalidFile:'That file is not a valid BottleTrack backup.', languageName:'English',
    noBarcode:'No barcode', scanUnsupported:'Barcode scanning is not supported in this browser. Type the barcode instead.',
    duplicate:'A product with this barcode already exists. Opening the existing product.', open:'Open product',
    emptyPrice:'No price recorded', productPhoto:'Product image', addNewDate:'Record a new expiration date',
    dateRequired:'Choose an expiration date.', saveChanges:'Save changes', product:'Product', optional:'Optional',
    currentStock:'Current stock', deleteBatch:'Remove date entry', sureBatch:'Remove this expiration entry?',
    date:'Date', source:'Entry', newProduct:'New product', editProduct:'Edit product', productCatalog:'Product catalog',
    expirySummary:'Expiration overview', noMatches:'No products match these filters.', languageChanged:'Language'
  },
  he: {
    app:'BottleTrack', tagline:'המלאי שלך. בתוקף. בשליטה.', overview:'סקירה כללית', inventory:'מלאי',
    expiring:'עומדים לפוג', expired:'פגי תוקף', products:'מוצרים', tracked:'מוצרים במעקב',
    search:'חיפוש לפי שם, ברקוד או תיאור…', scan:'סריקת ברקוד', add:'הוספת מוצר', addLot:'הוספת תאריך / אצווה',
    all:'כל המוצרים', ok:'בתוקף', soon:'עומדים לפוג', overdue:'פג תוקף', noProducts:'עדיין אין מוצרים',
    noProductsHint:'סרקו בקבוק או הוסיפו מוצר ראשון כדי להתחיל לעקוב אחר תאריכים ומחירים.',
    barcode:'ברקוד', name:'שם המוצר', description:'תיאור (לא חובה)', price:'מחיר לבקבוק',
    expiry:'תאריך תפוגה', batch:'אצווה / הערה (לא חובה)', photo:'תמונת מוצר (לא חובה)',
    save:'שמירת מוצר', saveLot:'שמירת אצווה', cancel:'ביטול', edit:'עריכה', history:'היסטוריה',
    details:'פרטי מוצר', dateHistory:'היסטוריית תאריכי תפוגה', priceHistory:'היסטוריית מחירים',
    latestExpiry:'תפוגה קרובה', lastPrice:'מחיר אחרון', added:'נוסף', updated:'עודכן',
    days:'ימים', today:'היום', expiredBy:'ימים לאחר התפוגה', expiresIn:'ימים נותרו', unknown:'אין תאריך',
    filter:'סינון', language:'שפה', backup:'גיבוי / שחזור', export:'ייצוא JSON',
    import:'ייבוא JSON', importHint:'הייבוא מחליף את הנתונים בדפדפן הזה. מומלץ לייצא גיבוי קודם.',
    close:'סגירה', noHistory:'אין עדיין היסטוריה', scanTitle:'סריקת ברקוד', scanHint:'כוונו את המצלמה לברקוד. אם הסריקה אינה זמינה, הזינו אותו ידנית.',
    manual:'הזנת ברקוד ידנית', useBarcode:'שימוש בברקוד', cameraError:'אין אפשרות להשתמש במצלמה או בסריקה. בדקו הרשאות או הזינו ברקוד ידנית.',
    cameraPermission:'יש לאפשר גישה למצלמה כדי לסרוק ברקוד.', confirmDelete:'למחוק את המוצר ואת ההיסטוריה שלו?',
    delete:'מחיקה', productSaved:'המוצר נשמר', selectPhoto:'בחירת תמונה', required:'נא להזין שם מוצר.',
    noExpiry:'אין תאריך תפוגה', priceOptional:'לא חובה', back:'חזרה למלאי', notes:'הערות',
    recent:'פעילות אחרונה', noActivity:'עדכונים אחרונים יופיעו כאן.', dateAdded:'תאריך רישום',
    batches:'תאריכים שנרשמו', priceLabel:'מחיר', addFirstDate:'הוספת תאריך התפוגה הראשון', productsCount:'מוצרים',
    localOnly:'אחסון במכשיר', localNotice:'הנתונים נשמרים בדפדפן הזה. ייצאו JSON לגיבוי או להעברה למכשיר אחר.',
    removePhoto:'הסרת תמונה', changePhoto:'החלפת תמונה', allDates:'כל התאריכים', clearSearch:'ניקוי חיפוש',
    overwriteTitle:'להחליף את הנתונים הקיימים?', overwriteBody:'פעולה זו תחליף את הנתונים בדפדפן. המשיכו רק אם זו הכוונה.',
    imported:'הנתונים יובאו בהצלחה', invalidFile:'זה אינו קובץ גיבוי תקין של BottleTrack.', languageName:'עברית',
    noBarcode:'ללא ברקוד', scanUnsupported:'הדפדפן אינו תומך בסריקת ברקוד. הזינו את הברקוד ידנית.',
    duplicate:'כבר קיים מוצר עם הברקוד הזה. פתיחת המוצר הקיים.', open:'פתיחת מוצר',
    emptyPrice:'לא נרשם מחיר', productPhoto:'תמונת מוצר', addNewDate:'רישום תאריך תפוגה חדש',
    dateRequired:'יש לבחור תאריך תפוגה.', saveChanges:'שמירת שינויים', product:'מוצר', optional:'לא חובה',
    currentStock:'מלאי נוכחי', deleteBatch:'הסרת תאריך', sureBatch:'להסיר את רישום התפוגה הזה?',
    date:'תאריך', source:'רישום', newProduct:'מוצר חדש', editProduct:'עריכת מוצר', productCatalog:'קטלוג מוצרים',
    expirySummary:'סקירת תפוגות', noMatches:'אין מוצרים התואמים לסינון.', languageChanged:'שפה'
  },
  ru: {
    app:'BottleTrack', tagline:'Ваш запас. Сроки под контролем.', overview:'Обзор', inventory:'Склад',
    expiring:'Скоро истекает', expired:'Просрочено', products:'Товары', tracked:'Товаров отслеживается',
    search:'Поиск по названию, штрихкоду, описанию…', scan:'Сканировать штрихкод', add:'Добавить товар', addLot:'Добавить дату / партию',
    all:'Все товары', ok:'В сроке', soon:'Скоро истекает', overdue:'Просрочено', noProducts:'Пока нет товаров',
    noProductsHint:'Отсканируйте бутылку или добавьте первый товар, чтобы отслеживать даты и цены.',
    barcode:'Штрихкод', name:'Название товара', description:'Описание (необязательно)', price:'Цена бутылки',
    expiry:'Срок годности', batch:'Партия / заметка (необязательно)', photo:'Фото товара (необязательно)',
    save:'Сохранить товар', saveLot:'Сохранить партию', cancel:'Отмена', edit:'Изменить', history:'История',
    details:'Информация о товаре', dateHistory:'История сроков годности', priceHistory:'История цен',
    latestExpiry:'Ближайший срок', lastPrice:'Последняя цена', added:'Добавлено', updated:'Обновлено',
    days:'дней', today:'Сегодня', expiredBy:'дн. просрочено', expiresIn:'дн. осталось', unknown:'Нет даты',
    filter:'Фильтр', language:'Язык', backup:'Резервная копия / восстановление', export:'Экспорт JSON',
    import:'Импорт JSON', importHint:'Импорт заменяет данные в этом браузере. Сначала сохраните резервную копию.',
    close:'Закрыть', noHistory:'Истории пока нет', scanTitle:'Сканирование штрихкода', scanHint:'Наведите камеру на штрихкод. Если сканирование недоступно, введите его вручную.',
    manual:'Ввести штрихкод вручную', useBarcode:'Использовать штрихкод', cameraError:'Камера или сканирование недоступны. Проверьте разрешения или введите штрихкод вручную.',
    cameraPermission:'Разрешите доступ к камере для сканирования.', confirmDelete:'Удалить товар и всю его историю?',
    delete:'Удалить', productSaved:'Товар сохранён', selectPhoto:'Выбрать изображение', required:'Введите название товара.',
    noExpiry:'Нет срока годности', priceOptional:'Необязательно', back:'Назад к складу', notes:'Заметки',
    recent:'Последние действия', noActivity:'Последние обновления появятся здесь.', dateAdded:'Дата записи',
    batches:'Записанные даты', priceLabel:'Цена', addFirstDate:'Добавить первый срок годности', productsCount:'товаров',
    localOnly:'Локальное хранилище', localNotice:'Данные хранятся в этом браузере. Экспортируйте JSON для резервной копии или переноса.',
    removePhoto:'Удалить фото', changePhoto:'Изменить фото', allDates:'Все даты', clearSearch:'Очистить поиск',
    overwriteTitle:'Заменить текущие данные?', overwriteBody:'Это заменит данные в браузере. Продолжайте, только если уверены.',
    imported:'Данные успешно импортированы', invalidFile:'Это недействительная резервная копия BottleTrack.', languageName:'Русский',
    noBarcode:'Нет штрихкода', scanUnsupported:'Этот браузер не поддерживает сканирование. Введите штрихкод вручную.',
    duplicate:'Товар с таким штрихкодом уже существует. Открываем существующий товар.', open:'Открыть товар',
    emptyPrice:'Цена не указана', productPhoto:'Фото товара', addNewDate:'Записать новый срок годности',
    dateRequired:'Укажите срок годности.', saveChanges:'Сохранить изменения', product:'Товар', optional:'Необязательно',
    currentStock:'Текущий запас', deleteBatch:'Удалить запись даты', sureBatch:'Удалить эту запись срока годности?',
    date:'Дата', source:'Запись', newProduct:'Новый товар', editProduct:'Изменить товар', productCatalog:'Каталог товаров',
    expirySummary:'Обзор сроков годности', noMatches:'Нет товаров, соответствующих фильтрам.', languageChanged:'Язык'
  }
};
const uid = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const readDB = () => { try { const v=JSON.parse(localStorage.getItem(STORAGE_KEY)); return v && Array.isArray(v.products) ? v : emptyDB; } catch { return emptyDB; } };
const daysUntil = d => d ? Math.ceil((new Date(d+'T00:00:00') - new Date(today()+'T00:00:00')) / 86400000) : null;
const statusFor = d => { const n=daysUntil(d); if(n===null)return 'unknown'; if(n<0)return 'expired'; if(n<=60)return 'soon'; return 'ok'; };
const fmtDate = (d, lang) => d ? new Intl.DateTimeFormat(lang==='he'?'he-IL':lang==='ru'?'ru-RU':'en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00')) : '—';
const fmtMoney = (p,lang) => p==null || p==='' ? '—' : new Intl.NumberFormat(lang==='he'?'he-IL':lang==='ru'?'ru-RU':'en-GB',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(Number(p));

function App(){
  const [db,setDb]=useState(readDB);
  const [lang,setLang]=useState(()=>localStorage.getItem(LANG_KEY)||'he');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [view,setView]=useState('inventory');
  const [selected,setSelected]=useState(null);
  const [modal,setModal]=useState(null);
  const [toast,setToast]=useState('');
  const [mobileMenu,setMobileMenu]=useState(false);
  const [scanValue,setScanValue]=useState('');
  const [scanError,setScanError]=useState('');
  const [cameraOn,setCameraOn]=useState(false);
  const [form,setForm]=useState(null);
  const [lotForm,setLotForm]=useState({expiry:'',price:'',note:''});
  const videoRef=useRef(null), scannerControlsRef=useRef(null), fileRef=useRef(null), importRef=useRef(null), scanLoop=useRef(false);
  const t=messages[lang]||messages.en, rtl=lang==='he';
  useEffect(()=>{ localStorage.setItem(STORAGE_KEY,JSON.stringify(db)); },[db]);
  useEffect(()=>{localStorage.setItem(LANG_KEY,lang); document.documentElement.lang=lang;document.documentElement.dir=rtl?'rtl':'ltr';},[lang,rtl]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(id)},[toast]);
  useEffect(()=>()=>stopCamera(),[]);
  const products=db.products;
  const enriched=useMemo(()=>products.map(p=>({...p,sortedLots:[...(p.lots||[])].sort((a,b)=>a.expiry.localeCompare(b.expiry)),nextLot:[...(p.lots||[])].filter(x=>x.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry)).find(x=>x.expiry>=today())||[...(p.lots||[])].filter(x=>x.expiry).sort((a,b)=>a.expiry.localeCompare(b.expiry))[0]})),[products]);
  const filtered=enriched.filter(p=>{
    const q=query.trim().toLowerCase();
    const match=!q||[p.name,p.barcode,p.description].some(x=>(x||'').toLowerCase().includes(q));
    const s=p.nextLot?statusFor(p.nextLot.expiry):'unknown';
    return match&&(filter==='all'||filter===s);
  }).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const soonCount=products.reduce((n,p)=>n+(p.lots||[]).filter(l=>l.expiry&&statusFor(l.expiry)==='soon').length,0);
  const expiredCount=products.reduce((n,p)=>n+(p.lots||[]).filter(l=>l.expiry&&statusFor(l.expiry)==='expired').length,0);
  const log=(type,product,detail='')=>setDb(prev=>({...prev,activity:[{id:uid(),type,product:product?.name||'',barcode:product?.barcode||'',detail,at:new Date().toISOString()},...(prev.activity||[])].slice(0,100)}));
  const notify=s=>setToast(s);
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
      const {BrowserMultiFormatReader}=await import('@zxing/browser');
      const reader=new BrowserMultiFormatReader();
      const controls=await reader.decodeFromVideoDevice(undefined,video,(result,_error,activeControls)=>{
        if(!result||!scanLoop.current)return;
        scannerControlsRef.current=activeControls;
        setScanValue(result.getText());
        stopCamera();
      });
      if(scanLoop.current)scannerControlsRef.current=controls;
      else controls.stop();
    }catch{setScanError(t.cameraError);stopCamera();}
  }
  function openScanner(){setScanValue('');setScanError('');setModal('scanner');}
  function handleBarcode(code){
    const barcode=(code||'').trim(); if(!barcode){setModal('form');setForm(newProductForm(''));return;}
    const found=products.find(p=>p.barcode===barcode);
    if(found){setModal(null);setSelected(found.id);setView('detail');notify(t.duplicate);return;}
    setModal('form');setForm(newProductForm(barcode));
  }
  function newProductForm(barcode=''){return {id:null,barcode,name:'',description:'',photo:'',price:'',expiry:'',note:''};}
  function openNew(){setForm(newProductForm(''));setModal('form');}
  function openEdit(p){setForm({id:p.id,barcode:p.barcode||'',name:p.name||'',description:p.description||'',photo:p.photo||'',price:p.price??'',expiry:'',note:''});setModal('form');}
  function saveProduct(e){
    e?.preventDefault();if(!form?.name.trim()){notify(t.required);return;}
    const stamp=new Date().toISOString();
    if(form.id){
      const old=products.find(p=>p.id===form.id);let priceHistory=[...(old.priceHistory||[])];
      if(form.price!==''&&String(form.price)!==String(old.price)){priceHistory.unshift({id:uid(),price:Number(form.price),date:today()});}
      let lots=[...(old.lots||[])];
      if(form.expiry){lots.unshift({id:uid(),expiry:form.expiry,price:form.price===''?null:Number(form.price),note:form.note,createdAt:stamp});}
      const updated={...old,name:form.name.trim(),barcode:form.barcode.trim(),description:form.description.trim(),photo:form.photo,price:form.price===''?old.price:Number(form.price),priceHistory,lots,updatedAt:stamp};
      setDb(prev=>({...prev,products:prev.products.map(p=>p.id===form.id?updated:p)}));log('updated',updated);setSelected(updated.id);setView('detail');
    }else{
      const id=uid(),lots=form.expiry?[{id:uid(),expiry:form.expiry,price:form.price===''?null:Number(form.price),note:form.note,createdAt:stamp}]:[];
      const priceHistory=form.price!==''?[{id:uid(),price:Number(form.price),date:today()}]:[];
      const p={id,barcode:form.barcode.trim(),name:form.name.trim(),description:form.description.trim(),photo:form.photo,price:form.price===''?null:Number(form.price),priceHistory,lots,createdAt:stamp,updatedAt:stamp};
      setDb(prev=>({...prev,products:[p,...prev.products]}));log('created',p);setSelected(id);setView('detail');
    }
    setModal(null);notify(t.productSaved);
  }
  function addLot(e){
    e?.preventDefault();if(!lotForm.expiry){notify(t.dateRequired);return;}
    const p=products.find(x=>x.id===selected);if(!p)return;
    const lot={id:uid(),expiry:lotForm.expiry,price:lotForm.price===''?null:Number(lotForm.price),note:lotForm.note.trim(),createdAt:new Date().toISOString()};
    const priceHistory=[...(p.priceHistory||[])];if(lot.price!==null)priceHistory.unshift({id:uid(),price:lot.price,date:today()});
    const updated={...p,lots:[lot,...(p.lots||[])],price:lot.price??p.price,priceHistory,updatedAt:new Date().toISOString()};
    setDb(prev=>({...prev,products:prev.products.map(x=>x.id===selected?updated:x)}));log('lot-added',updated,fmtDate(lot.expiry,lang));
    setLotForm({expiry:'',price:'',note:''});setModal(null);notify(t.productSaved);
  }
  function deleteProduct(p){if(!confirm(t.confirmDelete))return;setDb(prev=>({...prev,products:prev.products.filter(x=>x.id!==p.id)}));log('deleted',p);setView('inventory');setSelected(null);}
  function deleteLot(lot){if(!confirm(t.sureBatch))return;const p=products.find(x=>x.id===selected);if(!p)return;setDb(prev=>({...prev,products:prev.products.map(x=>x.id===p.id?{...x,lots:x.lots.filter(l=>l.id!==lot.id)}:x)}));}
  function exportJSON(){const blob=new Blob([JSON.stringify({...db,exportedAt:new Date().toISOString(),schemaVersion:1},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`bottletrack-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);}
  function importJSON(e){const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(reader.result);if(!Array.isArray(value.products)||!Array.isArray(value.activity||[]))throw Error();if(confirm(t.overwriteTitle+'\n'+t.overwriteBody)){setDb({products:value.products,activity:value.activity||[]});setView('inventory');setSelected(null);notify(t.imported);}}catch{notify(t.invalidFile);}e.target.value='';};reader.readAsText(file);}
  function photoChange(e){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>setForm(v=>({...v,photo:reader.result}));reader.readAsDataURL(f);e.target.value='';}
  const selectedProduct=enriched.find(p=>p.id===selected);
  const statusLabel=s=>s==='expired'?t.overdue:s==='soon'?t.soon:s==='ok'?t.ok:t.unknown;
  const StatusPill=({status})=><span className={`status status-${status}`}>{status==='expired'?<AlertTriangle size={13}/>:status==='soon'?<Clock3 size={13}/>:status==='ok'?<CheckCircle2 size={13}/>:<CalendarClock size={13}/>} {statusLabel(status)}</span>;
  const goInventory=()=>{setView('inventory');setSelected(null);setMobileMenu(false)};
  return <div className={`app ${rtl?'rtl':''}`}>
    <aside className={`sidebar ${mobileMenu?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark"><Wine size={23}/></div><div><strong>BottleTrack</strong><span>{t.tagline}</span></div></div>
      <div className="nav-label">{t.overview}</div>
      <button className={`nav-item ${view==='inventory'?'active':''}`} onClick={goInventory}><Package size={18}/><span>{t.inventory}</span><span className="nav-count">{products.length}</span></button>
      <button className={`nav-item ${view==='expiring'?'active':''}`} onClick={()=>{setFilter('soon');setView('inventory');setMobileMenu(false)}}><Clock3 size={18}/><span>{t.expiring}</span>{soonCount>0&&<span className="nav-count warn">{soonCount}</span>}</button>
      <button className={`nav-item ${view==='expired'?'active':''}`} onClick={()=>{setFilter('expired');setView('inventory');setMobileMenu(false)}}><AlertTriangle size={18}/><span>{t.expired}</span>{expiredCount>0&&<span className="nav-count danger">{expiredCount}</span>}</button>
      <div className="sidebar-bottom">
        <div className="local-note"><div className="local-note-icon"><CircleHelp size={17}/></div><div><b>{t.localOnly}</b><p>{t.localNotice}</p></div></div>
        <div className="backup-actions"><button onClick={exportJSON}><Download size={16}/>{t.export}</button><button onClick={()=>importRef.current?.click()}><Upload size={16}/>{t.import}</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJSON}/></div>
        <div className="lang-picker"><Languages size={17}/><select aria-label={t.language} value={lang} onChange={e=>setLang(e.target.value)}><option value="he">עברית</option><option value="en">English</option><option value="ru">Русский</option></select><ChevronDown size={14}/></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-toggle" onClick={()=>setMobileMenu(v=>!v)} aria-label="Menu"><Menu/></button><div className="breadcrumb">{t.productCatalog}<span>/</span><b>{view==='detail'?selectedProduct?.name||t.details:view==='inventory'?t.inventory:t.expirySummary}</b></div><div className="top-actions"><span className="storage-dot"></span><span className="storage-label">{t.localOnly}</span><button className="button primary top-add" onClick={openNew}><Plus size={17}/>{t.add}</button></div></header>
      {view==='detail'&&selectedProduct ? <section className="content detail-content">
        <button className="back-link" onClick={goInventory}>← {t.back}</button>
        <div className="detail-header"><div className="detail-identity">{selectedProduct.photo?<img className="detail-photo" src={selectedProduct.photo} alt={selectedProduct.name}/>:<div className="detail-photo placeholder"><Wine size={34}/></div>}<div><div className="eyebrow">{t.details}</div><h1>{selectedProduct.name}</h1><div className="subline"><Barcode size={15}/>{selectedProduct.barcode||t.noBarcode}</div></div></div><div className="detail-actions"><button className="button secondary" onClick={()=>openEdit(selectedProduct)}><Pencil size={16}/>{t.edit}</button><button className="button primary" onClick={()=>{setLotForm({expiry:'',price:selectedProduct.price??'',note:''});setModal('lot')}}><Plus size={17}/>{t.addLot}</button></div></div>
        {selectedProduct.description&&<p className="description">{selectedProduct.description}</p>}
        <div className="stats-row"><div className="stat-card"><span>{t.lastPrice}</span><strong>{fmtMoney(selectedProduct.price,lang)}</strong><small>{t.priceHistory}</small></div><div className="stat-card"><span>{t.latestExpiry}</span><strong>{selectedProduct.nextLot?fmtDate(selectedProduct.nextLot.expiry,lang):t.unknown}</strong>{selectedProduct.nextLot&&<small><StatusPill status={statusFor(selectedProduct.nextLot.expiry)}/></small>}</div><div className="stat-card"><span>{t.batches}</span><strong>{(selectedProduct.lots||[]).length}</strong><small>{t.dateHistory}</small></div></div>
        <div className="detail-grid"><section className="panel"><div className="panel-heading"><div><h2><CalendarClock size={19}/>{t.dateHistory}</h2><p>{t.batches}</p></div><button className="small-action" onClick={()=>{setLotForm({expiry:'',price:selectedProduct.price??'',note:''});setModal('lot')}}><Plus size={15}/>{t.addLot}</button></div>
          {selectedProduct.sortedLots?.length?<div className="timeline">{selectedProduct.sortedLots.map((lot,i)=><div className="timeline-row" key={lot.id}><div className={`timeline-dot ${statusFor(lot.expiry)}`}></div><div className="timeline-main"><strong>{fmtDate(lot.expiry,lang)}</strong><span>{lot.note||t.dateAdded}: {fmtDate((lot.createdAt||'').slice(0,10),lang)}</span>{lot.price!=null&&<small>{t.priceLabel}: {fmtMoney(lot.price,lang)}</small>}</div><StatusPill status={statusFor(lot.expiry)}/><button className="icon-btn subtle" title={t.deleteBatch} onClick={()=>deleteLot(lot)}><Trash2 size={15}/></button></div>)}</div>:<div className="empty-small"><CalendarDays size={25}/><p>{t.noHistory}</p><button className="text-button" onClick={()=>setModal('lot')}>{t.addFirstDate}</button></div>}
        </section><section className="panel"><div className="panel-heading"><div><h2><History size={19}/>{t.priceHistory}</h2><p>{t.lastPrice}</p></div></div>
          {(selectedProduct.priceHistory||[]).length?<div className="price-list">{selectedProduct.priceHistory.map(ph=><div className="price-row" key={ph.id}><div className="price-icon"><ArrowUpRight size={16}/></div><div><strong>{fmtMoney(ph.price,lang)}</strong><span>{fmtDate(ph.date,lang)}</span></div></div>)}</div>:<div className="empty-small"><History size={25}/><p>{t.emptyPrice}</p></div>}
          <div className="panel-footer"><button className="delete-button" onClick={()=>deleteProduct(selectedProduct)}><Trash2 size={15}/>{t.delete}</button></div>
        </section></div>
      </section>:<section className="content">
        <div className="page-heading"><div><div className="eyebrow">{t.overview}</div><h1>{t.inventory}</h1><p>{t.tagline}</p></div><button className="button primary mobile-add" onClick={openNew}><Plus size={17}/>{t.add}</button></div>
        <div className="metric-grid">
          <div className="metric"><div className="metric-top"><span>{t.tracked}</span><div className="metric-icon green"><Package size={18}/></div></div><strong>{products.length}</strong><small>{t.productsCount}</small></div>
          <div className="metric"><div className="metric-top"><span>{t.expiring}</span><div className="metric-icon amber"><Clock3 size={18}/></div></div><strong>{soonCount}</strong><small>{t.soon}</small></div>
          <div className="metric"><div className="metric-top"><span>{t.expired}</span><div className="metric-icon red"><AlertTriangle size={18}/></div></div><strong>{expiredCount}</strong><small>{t.overdue}</small></div>
        </div>
        <section className="inventory-panel">
          <div className="inventory-toolbar"><div><h2>{t.productCatalog}</h2><p>{filtered.length} {t.productsCount}</p></div><div className="toolbar-controls"><label className="searchbox"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/>{query&&<button onClick={()=>setQuery('')} aria-label={t.clearSearch}><X size={15}/></button>}</label><label className="filterbox"><Filter size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t.all}</option><option value="ok">{t.ok}</option><option value="soon">{t.soon}</option><option value="expired">{t.overdue}</option><option value="unknown">{t.unknown}</option></select></label></div></div>
          {filtered.length? <div className="product-list">{filtered.map(p=>{const s=p.nextLot?statusFor(p.nextLot.expiry):'unknown';return <button className="product-row" key={p.id} onClick={()=>{setSelected(p.id);setView('detail');setMobileMenu(false)}}><div className="product-thumb">{p.photo?<img src={p.photo} alt=""/>:<Wine size={22}/>}</div><div className="product-main"><strong>{p.name}</strong><span>{p.barcode||t.noBarcode}{p.description&&` · ${p.description}`}</span></div><div className="product-expiry"><span>{t.latestExpiry}</span><strong>{p.nextLot?fmtDate(p.nextLot.expiry,lang):t.unknown}</strong></div><div className="product-status"><StatusPill status={s}/>{p.nextLot&&<small>{daysUntil(p.nextLot.expiry)===0?t.today:daysUntil(p.nextLot.expiry)<0?`${Math.abs(daysUntil(p.nextLot.expiry))} ${t.expiredBy}`:`${daysUntil(p.nextLot.expiry)} ${t.expiresIn}`}</small>}</div><div className="product-price"><span>{t.priceLabel}</span><strong>{fmtMoney(p.price,lang)}</strong></div><ArrowUpRight className="row-arrow" size={17}/></button>})}</div>:<div className="empty-state"><div className="empty-illustration"><ScanLine size={34}/></div><h3>{query||filter!=='all'?t.noMatches:t.noProducts}</h3><p>{t.noProductsHint}</p><div className="empty-actions"><button className="button primary" onClick={openScanner}><ScanLine size={17}/>{t.scan}</button><button className="button secondary" onClick={openNew}><Plus size={17}/>{t.add}</button></div></div>}
        </section>
        <div className="bottom-tip"><div className="tip-icon"><CircleHelp size={17}/></div><p><strong>{t.localOnly}</strong> — {t.localNotice}</p><button onClick={exportJSON}>{t.export}<Download size={15}/></button></div>
      </section>}
    </main>
    {modal==='form'&&form&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal form-modal"><div className="modal-heading"><div><div className="eyebrow">{form.id?t.editProduct:t.newProduct}</div><h2>{form.id?t.editProduct:t.add}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><form onSubmit={saveProduct}><div className="form-grid"><label className="field full"><span>{t.barcode}</span><div className="barcode-input"><Barcode size={18}/><input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})} placeholder="7290000000000"/><button type="button" onClick={()=>{setModal('scanner');setScanValue(form.barcode||'')}} title={t.scan}><Camera size={17}/></button></div></label><label className="field full"><span>{t.name} *</span><input autoFocus required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t.name}/></label><label className="field full"><span>{t.description}</span><textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={t.description}/></label>
        <label className="field"><span>{t.price} ({t.optional})</span><div className="price-input"><span>₪</span><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="0.00"/></div></label>
        <label className="field"><span>{t.expiry} ({t.optional})</span><input type="date" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})}/></label>
        {form.expiry&&<label className="field full"><span>{t.batch}</span><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder={t.batch}/></label>}
        <div className="field full"><span>{t.photo}</span><div className="photo-upload">{form.photo?<><img src={form.photo} alt={t.productPhoto}/><div><b>{t.productPhoto}</b><button type="button" className="text-button" onClick={()=>fileRef.current?.click()}>{t.changePhoto}</button><button type="button" className="text-button danger-text" onClick={()=>setForm({...form,photo:''})}>{t.removePhoto}</button></div></>:<button type="button" className="upload-placeholder" onClick={()=>fileRef.current?.click()}><ImagePlus size={22}/><span>{t.selectPhoto}</span></button>}<input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={photoChange}/></div></div>
      </div><div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setModal(null)}>{t.cancel}</button><button type="submit" className="button primary"><Save size={16}/>{form.id?t.saveChanges:t.save}</button></div></form></div></div>}
    {modal==='lot'&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal lot-modal"><div className="modal-heading"><div><div className="eyebrow">{selectedProduct?.name}</div><h2>{t.addNewDate}</h2></div><button className="icon-btn" onClick={()=>setModal(null)}><X/></button></div><form onSubmit={addLot}><label className="field"><span>{t.expiry} *</span><input required type="date" value={lotForm.expiry} onChange={e=>setLotForm({...lotForm,expiry:e.target.value})}/></label><label className="field"><span>{t.price} ({t.optional})</span><div className="price-input"><span>₪</span><input type="number" min="0" step="0.01" value={lotForm.price} onChange={e=>setLotForm({...lotForm,price:e.target.value})} placeholder="0.00"/></div></label><label className="field"><span>{t.batch}</span><input value={lotForm.note} onChange={e=>setLotForm({...lotForm,note:e.target.value})} placeholder={t.batch}/></label><div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setModal(null)}>{t.cancel}</button><button className="button primary" type="submit"><Save size={16}/>{t.saveLot}</button></div></form></div></div>}
    {modal==='scanner'&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&(stopCamera(),setModal(null))}><div className="modal scanner-modal"><div className="modal-heading"><div><div className="eyebrow">{t.inventory}</div><h2><ScanLine size={22}/>{t.scanTitle}</h2></div><button className="icon-btn" onClick={()=>{stopCamera();setModal(null)}}><X/></button></div><p className="modal-description">{t.scanHint}</p><div className="scanner-view">{cameraOn?<><video ref={videoRef} muted playsInline/><div className="scan-frame"><span></span></div></>:<div className="scanner-placeholder"><Camera size={36}/><span>{t.cameraPermission}</span></div>}</div>{scanError&&<div className="inline-error">{scanError}</div>}<button className="button secondary camera-button" onClick={cameraOn?stopCamera:startCamera}><Camera size={17}/>{cameraOn?t.cancel:t.scan}</button><div className="manual-entry"><label className="field"><span>{t.manual}</span><input value={scanValue} onChange={e=>setScanValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(stopCamera(),handleBarcode(scanValue))} placeholder="7290000000000" autoFocus/></label><button className="button primary" onClick={()=>{stopCamera();handleBarcode(scanValue)}}>{t.useBarcode}</button></div></div></div>}
    {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);