# 🍽️ Campus GrubHub

> **A comprehensive food ordering and management platform designed specifically for campus environments**

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Database-Firebase-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Custom-blue?style=flat-square)](./LICENSE.md)

## 📖 Overview

Campus GrubHub is a modern, full-stack web application that revolutionizes campus food services by providing a centralized platform for real-time food interactions. From mess feedback systems to café pre-ordering capabilities, this platform bridges the gap between students, food service providers, and administrators.

## ✨ Key Features

### 🏠 **Home Dashboard**
- **Mess Menu Feedback System**: Weekly leaderboard of most-liked meals with daily menu display
- **Interactive Rating System**: Like/Dislike buttons for each meal (breakfast, lunch, dinner)
- **Daily Quotes & Images**: Motivational content with optional meal imagery
- **Vote Analytics**: Comprehensive voting statistics and trends

### 🍕 **Aunty's Café Integration**
- **Real-time Menu Display**: Live café menu with pricing, item descriptions, and availability status
- **Advanced Search & Filters**: Find meals by dietary preferences (veg/non-veg)
- **Dynamic Updates**: Real-time badge notifications (e.g., "Sold Out" indicators)
- **Interactive Feedback**: Like/Dislike system with optional user comments
- **Pre-Order Module**: Advanced ordering system with time slot selection and quantity management

### 👨‍💼 **Administrative Dashboard**
- **Secure Authentication**: Google Login and Email integration with admin privileges
- **Menu Management**: Complete CRUD operations for café menus (item list, pricing, availability)
- **Analytics & Insights**: Comprehensive statistics and feedback monitoring
- **Order Management**: Real-time order tracking and status updates

### 👤 **User Experience**
- **Personalized Profiles**: Individual user accounts with preferences and order history
- **Smart Alerts**: Notification system for meal preferences
- **Favorite Tracking**: Save and track preferred dishes across mess and café
- **Order History**: Complete transaction history with detailed summaries
- **Trend Analysis**: Personal eating patterns and campus food trends

### 📊 **Analytics & Reporting**
- **Visual Data Representation**: Charts and graphs for voting patterns (Pie Charts, Bar Graphs)
- **Historical Data**: Past menu analysis with day selectors
- **Real-time Statistics**: Live voting counts and order summaries

## 🛠️ Technology Stack

### **Frontend**
- **React.js** - Modern component-based UI framework
- **JavaScript (ES6+)** - Core programming language
- **CSS3** - Responsive styling and animations
- **React Router** - Client-side routing

### **Backend & Database**
- **Firebase Authentication** - Secure user authentication with Google Sign-in
- **Firebase Firestore** - NoSQL real-time database
- **Firebase Hosting** - Reliable web hosting platform

### **Additional Libraries & Tools**
- **Chart.js** - Data visualization for analytics
- **Firebase SDK** - Complete Firebase integration

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Firebase account for backend services

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/00aaryan00/Campus-GrubHub.git
   cd campus-grubhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Google Sign-in) and Firestore Database
   - Add your Firebase configuration to `src/firebase.js`

4. **Run the development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 👥 Development Team

This project was ideated by **Aryan Verma**, who envisioned a centralized platform for real-time food interactions on campus. The system was then planned, expanded, and collaboratively built into a full-fledged web application.

### **Aryan Verma** - *Project Ideator & Lead Developer*
- 💡 **Original Concept**: Conceived the idea of Campus GrubHub
- 🚀 **Project Initialization**: Set up the development environment and installed all necessary libraries
- 🎨 **UI/UX Design**: Led the design process and user interface development
- ⚙️ **Core Development**: Built admin dashboard, admin authentication, and main café interface
- 🔧 **Problem Solving**: Resolved technical challenges and system integration issues

### **Anshi Gupta** - *Full-Stack Developer & Firebase Specialist*
- 🔐 **Firebase Integration**: Implemented authentication system and database architecture
- 🏠 **Frontend Development**: Created home page, mess statistics, and café analytics components
- 📱 **User Experience**: Developed login system with Google Sign-in integration
- 📊 **Admin Tools**: Built admin order management and café pre-order systems
- 🔔 **Feature Implementation**: Integrated notifications, user order summaries, and about page

> **Design Philosophy**: The user interface and experience design was a collaborative effort, with both developers contributing to create an intuitive and visually appealing platform.

## 🌟 Future Enhancements

- **Mobile Application**: React Native app for iOS and Android
- **Payment Integration**: Secure payment gateway for online transactions
- **Delivery Tracking**: Real-time order tracking system
- **AI Recommendations**: Machine learning-based meal suggestions
- **Multi-Campus Support**: Scalability for multiple educational institutions
- **Inventory Management**: Automated stock tracking for café items

## 📄 License

This project is licensed under a Custom License - see the [LICENSE.md](LICENSE.md) file for details.

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and feel free to submit pull requests or open issues for bugs and feature requests.

## 📞 Contact

- **Anshi**: guptanshi4u@gmail.com
- **Aryan**: aryan28nov05@gmail.com