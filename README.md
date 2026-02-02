# 👻 GHOSTWIRE

ghostwire is a high-performance, real-time chat application with a discord-inspired interface. it’s built for speed, reliability, and clean architecture, supporting private group messaging, real-time notifications, and mobile-friendly interactions.

---

## ✨ features

* **real-time interaction**
  instant messaging powered by socket.io.

* **group management**
  create groups and manage members with an admin-only interface.

* **smart notifications**
  unread message indicators (blue dots) and global audio alerts.

* **reconnection logic**
  automatically syncs missed messages when a connection drops and reconnects.

* **mobile optimized**
  sidebar toggle and swipe-to-open support for small screens.

* **theming**
  custom background patterns and glassmorphism-style ui elements.

---

## 🛠 tech stack

* **frontend:** html5, tailwind css, javascript (es modules)
* **backend:** node.js, express
* **real-time:** socket.io
* **database:** mysql

---

## ⚙️ installation & setup

### 1. prerequisites

* node.js (v16.x or later)
* mysql (v8.0 or later)

---

### 2. clone the repository

```bash
git clone https://github.com/your-username/ghostwire.git
cd ghostwire
```

---

### 3. install dependencies

```bash
npm install
```

---

### 4. database configuration

you must create a database and import the provided schema.

**create the database**

```sql
create database ghostwire_db;
```

**import the schema (from project root)**

```bash
mysql -u root -p ghostwire_db < src/config/ghostwire_schema.sql
```

---

### 5. environment setup

create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=ghostwire_db
PORT=3000
SESSION_SECRET=your_random_secret
```

---

### 6. run the app

```bash
# development mode
npm run dev

# production mode
npm start
```

the app will be available at:

```
http://localhost:3000
```

---

## 📁 key file structure

* **js/chat.js**
  main application controller and ui event listeners

* **js/chat-socket.js**
  real-time socket logic and message synchronization

* **js/chat-ui.js**
  dom manipulation and message rendering helpers

* **js/chat-api.js**
  fetch wrappers for rest api endpoints

* **public/assets/sounds/**
  notification audio files

---

## 🚀 recent updates

* added swipe-to-open sidebar for mobile users
* implemented persistent reconnection with automatic history refresh
* added global notification sound (plays regardless of active group)
* added unread indicators (blue pulse dots) for inactive groups

---

## 📝 roadmap

* [ ] image and file upload support
* [ ] “user is typing…” indicators
* [ ] message read receipts (double checkmarks)
* [ ] dark / light mode toggle

---

## 🤝 contributing

1. fork the project
2. create your feature branch

   ```bash
   git checkout -b feature/amazingfeature
   ```
3. commit your changes

   ```bash
   git commit -m "add some amazingfeature"
   ```
4. push to the branch

   ```bash
   git push origin feature/amazingfeature
   ```
5. open a pull request

---

## 📄 license

distributed under the **mit license**.