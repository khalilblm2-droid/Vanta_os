# VANTA OS — دليل الإعداد الكامل على Replit

> **ملاحظة مهمة:** تم وضع مفاتيحك في ملف `.env` جاهزة. تحتاج فقط لتحديث URL الخاص بـ Replit وقاعدة البيانات.

---

## 📋 ما تحتاجه قبل البدء

1. ✅ حساب Replit (مجاني)
2. ✅ حساب Shopify Partner (مجاني على partners.shopify.com)
3. ✅ متجر تطوير Shopify (dev store)
4. ✅ تم استخراج المفاتيح من Shopify Partner Dashboard:
   - `SHOPIFY_API_KEY`: `REPLACE_WITH_YOUR_SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`: `REPLACE_WITH_YOUR_SHOPIFY_API_SECRET`
5. ✅ تم استخراج مفتاح Gemini:
   - `GEMINI_API_KEY`: `REPLACE_WITH_YOUR_GEMINI_API_KEY`

---

## 🚀 الخطوة 1: إنشاء مشروع Replit

1. اذهب إلى [replit.com](https://replit.com)
2. اضغط **"Create Repl"**
3. اختر template: **"Node.js"**
4. اسم المشروع: `vanta-os`
5. اضغط **"Create Repl"**

---

## 📦 الخطوة 2: رفع المشروع

### الطريقة 1: عبر ملف ZIP

1. فك ضغط `vanta-os.zip` على جهازك
2. في Replit، افتح **Shell**
3. ارفع الملفات عبر drag & drop في لوحة الملفات

### الطريقة 2: عبر Git (موصى به)

```bash
# في Shell الخاص بـ Replit
git clone https://github.com/yourusername/vanta-os.git .
```

---

## 🔧 الخطوة 3: تثبيت الحزم

في **Shell** Replit:

```bash
npm install
```

سيقوم هذا تلقائياً بـ:
- تثبيت كل الحزم
- تشغيل `prisma generate` (بفضل `postinstall` script)

---

## 🗄️ الخطوة 4: إعداد قاعدة البيانات

### في Replit:

1. في لوحة **Tools** (يسار الشاشة)، اضغط على **Database**
2. اضغط **"Create Database"**
3. اختر **PostgreSQL**
4. انسخ **Connection String** (يبدأ بـ `postgresql://...`)

### تحديث ملف `.env`:

افتح ملف `.env` وعدّل هذين السطرين:

```env
DATABASE_URL="postgresql://your-actual-connection-string"
DIRECT_URL="postgresql://your-actual-connection-string"
```

---

## 🔴 الخطوة 5: إعداد Redis (اختياري للبدء)

> **ملاحظة:** يمكنك تخطي هذه الخطوة في البداية — التطبيق سيعمل بدون Redis للتجربة.

### في Replit:

1. في لوحة **Tools**، اضغط على **Database**
2. اضغط **"Create Database"**
3. اختر **Redis**
4. انسخ **Connection String**

### تحديث ملف `.env`:

```env
REDIS_URL=redis://your-actual-redis-url
```

---

## 🌐 الخطوة 6: الحصول على رابط Replit

1. في Replit، اضغط **"Run"** (الزر الأخضر بأعلى الشاشة)
2. ستحصل على رابط مثل: `https://vanta-os.yourusername.repl.co`
3. انسخ هذا الرابط

### تحديث ملف `.env`:

افتح `.env` وعدّل:

```env
APP_URL=https://vanta-os.yourusername.repl.co
SHOPIFY_APP_URL=https://vanta-os.yourusername.repl.co
```

---

## 🏗️ الخطوة 7: إنشاء قاعدة البيانات

في **Shell** Replit:

```bash
# إنشاء الجداول
npx prisma migrate deploy

# (اختياري) بيانات أولية
npm run seed
```

---

## 🛠️ الخطوة 8: بناء المشروع

```bash
npm run build
```

---

## ▶️ الخطوة 9: تشغيل التطبيق

### في Replit:

اضغط زر **"Run"** الأخضر. أو في Shell:

```bash
npm run start
```

### التحقق:

افتح رابط Replit في المتصفح:
- `https://vanta-os.yourusername.repl.co/health`
- يجب أن ترى JSON يحتوي على `"status":"ok"`

---

## ⚙️ الخطوة 9.5: نشر الـ Background Worker (مهم جداً)

> **تحذير:** بدون هذه الخطوة، المهام (tasks) لن تُعالج أبداً. الـ web server فقط يضع المهام في الطابور (queue) — الـ worker هو الذي ينفذها.

Replit لا يدعم تعريف deploymentين في ملف `.replit` واحد. تحتاج لإنشاء deployment ثاني يدوياً:

1. في Replit، اذهب إلى **Deployments** panel (تبويب Deployments في الأعلى)
2. اضغط **"Create Deployment"**
3. اختر نوع **"Background Worker"** (ليس Web Service)
4. في **Run command**، اكتب:
   ```
   npm run start:worker
   ```
5. تأكد أن نفس متغيرات البيئة (Environment Variables) موجودة — خاصة:
   - `DATABASE_URL` (نفس قاعدة البيانات)
   - `REDIS_URL` (نفس Redis)
   - `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `GEMINI_API_KEY`
   - كل متغيرات `.env` الأخرى
6. اضغط **Deploy**

> **التحقق:** بعد النشر، افتح logs الـ worker — يجب أن ترى:
> ```
> [VANTA] VANTA OS worker ready
> ```

بدون هذا الـ worker:
- المهام تظل في حالة QUEUED للأبد
- Guardian Mode لا يعمل
- Recurring Missions لا تنفذ
- لا توجد معالجة للأخطاء أو self-healing

---

## 🛒 الخطوة 10: إعداد Shopify Partner Dashboard

1. اذهب إلى [partners.shopify.com](https://partners.shopify.com)
2. **Apps** → **Create app** → **Custom app**
3. اسم التطبيق: `VANTA OS`
4. اضغط **Create app**

### في إعدادات التطبيق:

#### App setup → URLs:
- **App URL:** `https://vanta-os.yourusername.repl.co`
- **Allowed redirection URI(s):**
  ```
  https://vanta-os.yourusername.repl.co/auth/callback
  ```

#### App setup → App preferences:
- **Embedded:** ✅ مفعّل

#### Webhooks subscription:
- اضغط **"Create webhook"** لكل من:
  - `app/uninstalled` → `https://vanta-os.yourusername.repl.co/webhooks/app/uninstalled`
  - `customers/redact` → `https://vanta-os.yourusername.repl.co/webhooks/customers/redact`
  - `customers/data_request` → `https://vanta-os.yourusername.repl.co/webhooks/customers/data_request`
  - `shop/redact` → `https://vanta-os.yourusername.repl.co/webhooks/shop/redact`

#### GDPR mandatory webhooks:
- نفس الروابط أعلاه

---

## 🧪 الخطوة 11: تثبيت التطبيق على متجر التطوير

1. في **Partner Dashboard** → **Apps** → **VANTA OS**
2. اضغط **"Select store"** → اختر متجر التطوير
3. اضغط **"Install"**
4. سيفتح Shopify صفحة الأذونات → اضغط **"Install app"**
5. سيتم تحويلك إلى تطبيق VANTA OS داخل Shopify Admin

---

## ✅ الخطوة 12: التحقق من العمل

### 1. في Shopify Admin:
- يجب أن يفتح التطبيق ويعرض صفحة **Onboarding**
- اقبل الشروط → اضغط **"Connect my store"**
- يجب أن ترى **Dashboard**

### 2. اختبر الـ Agent:
- اذهب إلى **Agent Canvas**
- اكتب: "Find all products with 0 inventory"
- اضغط **Send**
- يجب أن ترى **Task Card** يتغير لونه من **Queued** → **Thinking** → **Completed**

---

## 🐛 حل المشاكل الشائعة

### مشكلة: شاشة بيضاء داخل Shopify

**السبب:** عادة يكون مشكلة CSP أو App Bridge

**الحل:**
1. افتح DevTools (F12) في المتصفح
2. اذهب إلى Console
3. إذا رأيت خطأ `Refused to frame` → تحقق من `APP_URL` في `.env`
4. إذا رأيت خطأ `App Bridge` → تحقق من `SHOPIFY_API_KEY`

### مشكلة: `Cannot find module '@prisma/client'`

**الحل:**
```bash
npx prisma generate
```

### مشكلة: `Database connection failed`

**الحل:**
1. تحقق من `DATABASE_URL` في `.env`
2. تأكد أن قاعدة البيانات تعمل في Replit
3. جرب: `npx prisma db push`

### مشكلة: `Redis connection failed`

**الحل:**
- التطبيق سيعمل بدون Redis (في وضع fallback)
- لكن BullMQ queue لن يعمل → Tasks لن تُعالج
- أضف Redis من Replit Database panel

### مشكلة: OAuth redirect loop

**السبب:** `APP_URL` أو `SHOPIFY_APP_URL` خاطئ

**الحل:**
1. تأكد أن `APP_URL` = `SHOPIFY_APP_URL` = رابط Replit الفعلي
2. تأكد أن redirect URL في Shopify Dashboard = `https://your-replit-url/auth/callback`

### مشكلة: `Invalid HMAC`

**السبب:** `SHOPIFY_API_SECRET` خاطئ

**الحل:**
1. تحقق من `SHOPIFY_API_SECRET` في `.env`
2. تأكد أنه `REPLACE_WITH_YOUR_SHOPIFY_API_SECRET` (المفتاح الذي أعطيته)

---

## 📞 الدعم

إذا واجهت مشاكل:

1. افتح DevTools → Console → انسخ الأخطاء
2. تحقق من `/health` endpoint: `https://your-url.repl.co/health`
3. تحقق من logs في Replit Shell

---

## 🎯 ملخص سريع

```bash
# 1. ثبّت الحزم
npm install

# 2. أنشئ قاعدة البيانات
npx prisma migrate deploy

# 3. ابنِ المشروع
npm run build

# 4. شغّل
npm run start
```

ثم في Shopify Partner Dashboard:
- App URL: `https://your-replit-url.repl.co`
- Redirect URL: `https://your-replit-url.repl.co/auth/callback`

ثم ثبّت التطبيق على متجرك. ✅
