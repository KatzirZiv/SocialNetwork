#  PalZone

PalZone is a full-stack social network platform that enables users to connect, share, and communicate in real time. This MVP delivers the essential features of a modern social network, including posts, groups, friends, chat, and statistics, with a responsive and intuitive UI.

---

## 🚀 Project Overview
PalZone is a social networking web application built with React (frontend) and Node.js/Express/MongoDB (backend). It supports user authentication, posting, commenting, groups, direct messaging, and analytics.

---

## ✨ Features (MVP)

- **User Authentication**: Register, login, logout, JWT-based auth, user profiles.
- **Feed & Posts**: Home feed, create/edit/delete posts (text, image, video), like, comment, filter posts.
- **Groups**: Browse, search, join, create, and manage groups (public/private), group feeds, group admin tools.
- **Friends & Social Graph**: Send/accept/reject friend requests, view friends list.
- **Direct Messaging**: Real-time chat with friends, online status, Socket.io-powered.
- **Statistics**: View analytics and activity graphs.
- **Modern UI/UX**: Material UI, responsive design, sidebar navigation.

---

## 🛠️ Tech Stack

- **Frontend**: React, React Router, Material UI, React Query, Socket.io-client
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, Multer
- **Testing**: Jest, Supertest
- **Other**: D3/Recharts (statistics), dotenv, CORS, Morgan

---

## 🏁 Getting Started

### Prerequisites
- Node.js 
- MongoDB (local or cloud)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/effisocial.git
   cd effisocial
   ```

2. **Install dependencies:**
   - Backend:
     ```bash
     cd server
     npm install
     ```
   - Frontend:
     ```bash
     cd ../client
     npm install
     ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env` in the `server/` folder and set your MongoDB URI, JWT secret, etc.

4. **Run the app:**
   - Start backend:
     ```bash
     cd server
     npm run dev
     ```
   - Start frontend:
     ```bash
     cd ../client
     npm start
     ```

5. **Open in browser:**
   - Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Folder Structure

```
SocialNetwork/
  client/      # React frontend
  server/      # Node.js/Express backend
```

- `client/` - React app (UI, components, pages, hooks, context)
- `server/` - Express API, models, controllers, routes, real-time (Socket.io)

---


---

## 🙌 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📣 Acknowledgements

- [React](https://react.dev/)
- [Material UI](https://mui.com/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Socket.io](https://socket.io/) 