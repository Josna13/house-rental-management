# House Rent Management System with AI Recommendation

## 1. Overview

The House Rent Management System is a full-stack web application that helps tenants find rental properties and allows property owners to manage listings efficiently. The system uses Artificial Intelligence to recommend suitable properties based on user preferences and interactions.

---

## 2. Features

### 2.1 User Management

* User Registration
* User Login
* JWT Authentication
* Secure Password Encryption

### 2.2 Property Management

* Add Property Listings
* Update Property Listings
* Delete Property Listings
* Upload Property Images
* Manage Property Availability

### 2.3 Search and Booking

* Property Search
* Advanced Filtering
* Location-Based Search
* Favorite Properties
* Booking Management
* Interactive Maps

### 2.4 AI Features

* AI-Based Property Recommendations
* Vacancy Notifications
* Rent Price Prediction
* Semantic Property Matching

---

## 3. Technology Stack

### 3.1 Frontend

* React 19
* Vite
* React Router DOM
* Tailwind CSS
* Axios
* React Toastify
* Leaflet
* React-Leaflet

### 3.2 Backend

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* JWT Authentication
* Bcrypt
* Multer
* Express Validator

### 3.3 AI Recommendation Service

* Python
* FastAPI
* PyTorch
* Scikit-Learn
* Sentence Transformers
* PyMongo
* Uvicorn

---

## 4. Project Structure

```text
house-rent-management-system/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── context/
│   └── services/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── uploads/
│   └── server.js
│
└── recommendation_service/
    ├── app.py
    └── requirements.txt
```

---

## 5. AI Recommendation Engine

### 5.1 Model Used

all-MiniLM-L6-v2 (Sentence Transformers)

### 5.2 Why This Model?

* Understands the semantic meaning of user preferences.
* Provides recommendations beyond exact keyword matching.
* Generates vector embeddings for users and properties.
* Fast and lightweight for real-time recommendations.
* Improves recommendation accuracy.

### 5.3 Recommendation Workflow

1. Collect user preferences.
2. Convert preferences and property descriptions into embeddings.
3. Calculate similarity scores using cosine similarity.
4. Rank properties based on relevance.
5. Return the most suitable recommendations.

---

## 6. Installation and Setup

### 6.1 Clone the Repository

```bash
git clone <repository-url>
cd house-rent-management-system
```

### 6.2 Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Run the backend server:

```bash
node server.js
```

---

### 6.3 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

### 6.4 AI Recommendation Service Setup

```bash
cd recommendation_service
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment:

Windows:

```bash
venv\Scripts\activate
```

Linux/Mac:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI server:

```bash
uvicorn app:app --reload --port 8000
```

---

## 7. System Modules

### 7.1 Tenant Module

* Register and Login
* Search Properties
* View Property Details
* Save Favorite Properties
* Book Properties
* Receive AI Recommendations

### 7.2 Property Owner Module

* Add Properties
* Update Properties
* Delete Properties
* Upload Property Images
* Manage Bookings
* Manage Availability

### 7.3 AI Module

* Property Recommendation Engine
* Rent Price Prediction
* Vacancy Notification Service

---

## 8. Security Features

* JWT-Based Authentication
* Password Hashing Using Bcrypt
* Input Validation
* Protected Routes
* Secure API Access

---

## 9. Future Enhancements

1. Online Rent Payment System
2. Property Reviews and Ratings
3. Mobile Application
4. AI Chat Assistant
5. Advanced Analytics Dashboard
6. Fraud Detection System

---

## 10. Developed Using

* React
* Node.js
* Express.js
* MongoDB Atlas
* FastAPI
* PyTorch
* Scikit-Learn
* Sentence Transformers

---
