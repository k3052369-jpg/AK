# 🚗 Auto Part - سیستەمی بەڕێوەبردنی مەخزەنی پارچەکانی ئۆتۆمۆبێل

سیستەمێکی پڕۆفیشناڵ و جوانی بەڕێوەبردنی مەخزەنی پارچەکانی ئۆتۆمۆبێل بە Node.js و MySQL.

---

## 📋 تایبەتمەندییەکان

- ✅ **داشبۆرد** - پیشاندانی ئامارەکان (کۆی بەرهەم، ستۆک، بەهای مەخزەن)
- ✅ **بەڕێوەبردنی بەرهەمەکان** - زیادکردن، دەستکاریکردن، سڕینەوە
- ✅ **فلتەرکردن و گەڕان** - بە ناو، جۆر، براند، بارودۆخی ستۆک
- ✅ **جۆرەکان** - بەڕێوەبردنی جۆرەکانی بەرهەم
- ✅ **دابینکەرەکان** - بەڕێوەبردنی دابینکەرەکان
- ✅ **کڕیار و هەژماری قەرز** - تۆمارکردنی کڕیار، فرۆشتنی قەرزدار و وەرگرتنی پارە
- ✅ **کڕینی کاڵا** - تۆمارکردنی کڕین، زیادکردنی ستۆک و چاودێری قەرزی دابینکەر
- ✅ **خەرجی و ڕاپۆرتی کاش** - تۆمارکردنی خەرجی و کۆی پارەی هاتوو و چوو
- ✅ **گەڕاندنەوەی فرۆشتن** - گەڕاندنەوەی کاڵا و نوێکردنەوەی ستۆک
- ✅ **بەرواری بەسەرچوون** - تۆمارکردنی بەروار و ڕاپۆرتی کاڵای بەسەرچوو/نزیک لە بەسەرچوون
- ✅ **بارکۆد و وەسڵی مۆبایل** - سکانکردنی بارکۆد بە کامێرا و چاپی وەسڵ لە وێبگەڕی مۆبایل
- ✅ **ڕێکخستنەکان** - پشتڕاستکردنەوەی فرۆشتن، فرۆشتنی قەرزدار و ئاگاداریی ستۆک
- ✅ **نرخی دۆلار بە شێوەی ئۆتۆماتیکی** - ئالان‌چەند سەرچاوەی سەرەکییە؛ open.er-api.com بە جێگرەوە بەکاردێت
- ✅ **نرخ بە دوو دراو** - دینار و دۆلار
- ✅ **پەیجینگ** - پەڕەپەڕەکردنی لیست
- ✅ **چاپکردن** - چاپکردنی لیستەکان
- ✅ **ڕیسپۆنسیڤ** - کاردەکات لەسەر هەموو ئامێرەکان

---

## 🛠️ پێویستییەکان

1. **Node.js** (v18+) - [دایبگرە لە nodejs.org](https://nodejs.org/)
2. **MySQL** (v8+) - [دایبگرە لە mysql.com](https://dev.mysql.com/downloads/)

---

## 🚀 چۆنیەتی دامەزراندن

### 1. Node.js دابمەزرێنە
لە [nodejs.org](https://nodejs.org/) Node.js دابمەزرێنە (LTS پێشنیارکراوە).

### 2. داتابەیس درووست بکە
فایلی `backend/database/schema.sql` بکەوە لە MySQL:

```bash
mysql -u root -p < backend/database/schema.sql
```

یان لە MySQL Workbench ناوەڕۆکی `schema.sql` بکەوە و ئیجراکردنی بکە.

### 3. ڕێکخستنەکان
فایلی `config/.env.example` بکۆپی بکە بۆ `.env` لە ڕەگی پرۆژەکە و زانیاری MySQL ـەکەت پڕبکەرەوە:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=auto_part_db
PORT=3000
JWT_SECRET=replace_with_a_long_random_secret
```

### 4. پاکێجەکان دابمەزرێنە
```bash
cd auto-part
npm install
```

### 5. سیستەمەکە بەکار بهێنە
```bash
npm start
```

ئینجا بکەوە بۆ: **http://localhost:3000**

لە یەکەم جاردا سێرڤەر خۆکارانە خشتەکانی POS و خانە پێویستەکانی فرۆشتن دروست دەکات. چاپکردنی وەسڵ لە مۆبایل بە پشتگیری وێبگەڕ و پرینتەری پەیوەستکراوەوە بەستراوە.

## ☁️ دامەزراندن لەسەر Vercel

### What to upload to GitHub

Upload the **whole project folder** with GitHub Desktop (Add an existing repository, then commit and push). Keep the project structure intact. Include:

- `backend/` and `frontend/`
- `config/.env.example` (the example only; it contains no real credentials)
- `package.json` and `package-lock.json`
- `vercel.json`, `README.md`, and `.gitignore`
- Other project files such as `render.yaml` and `import-database.bat`

Do **not** upload `.env` (it contains private settings), `node_modules/`, or real uploaded/customer files in `uploads/`. The existing `.gitignore` excludes these automatically. Never put database passwords, API keys, or a real `JWT_SECRET` in GitHub; set them in Vercel Environment Variables instead.

1. Push the project to a GitHub repository.
2. لە Vercel پرۆژەی نوێیەکە دروست بکە و `Root Directory` بە `.` جێبهێڵە.
3. ئەم ژینگەکانە لە **Settings → Environment Variables** زیاد بکە:

```env
DB_HOST=YOUR_MYSQL_HOST
DB_PORT=3306
DB_USER=YOUR_MYSQL_USER
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=YOUR_MYSQL_DATABASE
DB_SSL=true
JWT_SECRET=long-random-secret
```

دەشتوانیت بەجێی ئەوانە `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE` زیاد بکەیت. داتابەیسێکی MySQL لە دەرەوەی کۆمپیوتەری ناوخۆیی دابمەزرێنە (وێک وه‌ک TiDB، Railway، PlanetScale، یان MySQL hosted). MySQL ناوخۆیی بەکارهێنانیەوە لە مۆبایلی ڕاستەوخۆ بەردەست نییە.

---

## 📁 شێوازی فایلەکان

```
auto-part/
├── backend/
│   ├── server.js           # سێرڤەری سەرەکی
│   ├── database/           # پەیوەندی و schema ـی داتابەیس
│   ├── middleware/         # middleware ـەکانی API
│   ├── routes/             # route ـەکانی API
│   ├── utils/              # ئامرازە یارمەتیدەرەکان
│   └── usd-iqd-rate.js      # نوێکردنەوەی نرخی دراو
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── uploads/                # شوێنی فایلە بارکراوەکان
├── config/
│   └── .env.example        # نموونەی ڕێکخستنەکان
├── package.json           # پاکێجەکان
├── .env                   # ڕێکخستنی نهێنی و ژینگە
└── README.md
```

---

## 🎨 سکرینشۆت

سیستەمەکە بە کوردی (RTL) دیزاین کراوە و تایبەتمەندییەکانی:
- سایدبار بە گرادیئێنت تاریک
- کارتەکانی داشبۆرد بە ڕەنگ جیاواز
- تەیبڵی بەرهەمەکان بە بادج و فلتەر
- مۆداڵی زیادکردن بە فۆرمی پڕۆفیشناڵ
- تۆست نۆتیفیکەیشن بۆ هەموو کردارەکان

---

**Auto Part v1.0.0** | 🚗 درووستکراوە بۆ مەخزەنی پارچەکانی ئۆتۆمۆبێل
