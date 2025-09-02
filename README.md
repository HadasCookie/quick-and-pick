# Quick & Pick - Smart Supermarket Price Comparison

A full-stack web application that helps users compare grocery prices across multiple Israeli supermarket chains, find the best deals, and manage their shopping lists efficiently.

## 🌟 Features

- **Smart Product Search**: Browse 50,000+ products across categories with intelligent search and autocomplete
- **Multi-Store Price Comparison**: Compare prices across major Israeli supermarket chains
- **AI-Powered Recommendations**: Get personalized product suggestions based on purchase history
- **Shopping List Management**: Create, save, and share shopping lists with family and friends
- **Price Drop Alerts**: Get notified when prices drop on your favorite products
- **Location-Based Search**: Find nearby stores within your preferred radius
- **WhatsApp Integration**: Share shopping lists directly via WhatsApp
- **Responsive Design**: Optimized for both desktop and mobile devices
- **User Preferences**: Set dietary restrictions, budget limits, and store preferences

## 🛠️ Technology Stack

### Frontend

- **React** 18.2.0 - Modern UI framework
- **React Router** - Client-side routing
- **Context API** - State management
- **Vanilla CSS** - Custom responsive styling

### Backend

- **Python Flask** - RESTful API server
- **MySQL** - Primary database (hosted on Google Cloud Platform)
- **Machine Learning**: Transformers, scikit-learn, pandas for recommendations
- **Background Tasks**: APScheduler for automated price updates
- **External APIs**: Integration with Israeli supermarket chains

### Infrastructure

- **Google Cloud Platform** - Database hosting & Stores and syncs supermarket data files for backend imports
- **Real-time Price Data** - Automated scraping from major supermarket chains
- **Email Notifications** - SMTP integration for price alerts
- **WhatsApp API** - Twilio integration for list sharing
- **OpenAI ChatGPT** – Product categorization (automated classification of supermarket items)

## 📋 Prerequisites

- **Python** 3.8 or higher
- **Node.js** 16.x or higher
- **npm** 8.x or higher
- **Database Access** - Contact project team for GCP database credentials

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone [repository-url]
cd quick-and-pick
```

### 2. Backend Setup (Python/Flask)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with provided credentials
```

### 3. Frontend Setup (React)

```bash
# Install Node.js dependencies
npm install

# Create frontend environment file
echo "REACT_APP_API_URL=http://localhost:5000" > .env
```

### 4. Database Configuration

**Important**: The database is hosted on Google Cloud Platform. To run this project:

1. **Contact the project team** for:

   - Database password
   - IP whitelist access to GCP MySQL instance
   - API keys for full functionality (Twilio, SMTP)

2. **Database Details**:
   - Host: `34.78.145.126`
   - Database: `quickpick`
   - Tables: Pre-configured with 50,000+ products and pricing data

### 5. Environment Variables

Create `.env` file in the server directory:

```env
DB_HOST=34.78.145.126
DB_USER=root
DB_PASSWORD=[CONTACT_TEAM_FOR_PASSWORD]
DB_NAME=quickpick

# Email Service (Optional)
SMTP_USER=[CONTACT_TEAM_FOR_CREDENTIALS]
SMTP_PASS=[CONTACT_TEAM_FOR_CREDENTIALS]
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587

# WhatsApp API (Optional)
TWILIO_ACCOUNT_SID=[CONTACT_TEAM_FOR_CREDENTIALS]
TWILIO_AUTH_TOKEN=[CONTACT_TEAM_FOR_CREDENTIALS]
```

### 6. Start the Application

**Backend** (Terminal 1):

```bash
python3 -m src.server
# Server runs on http://localhost:5000
```

**Frontend** (Terminal 2):

```bash
npm start
# Application opens at http://localhost:3000
```

## 📱 Usage

1. **Register/Login** - Create an account or log in
2. **Set Preferences** - Configure dietary restrictions, budget, and store preferences
3. **Browse Products** - Use categories or search to find products
4. **Build Shopping List** - Add products to your cart with quantities
5. **Compare Stores** - Find the best prices across nearby supermarkets
6. **Get Recommendations** - Discover new products based on your shopping history
7. **Set Price Alerts** - Get notified when prices drop on your lists
8. **Share Lists** - Send shopping lists via WhatsApp to family members

## 🏗️ Project Structure

```
quick-and-pick/
├── public/                 # Static assets and images
│   └── images/            # Product images organized by category
├── src/
│   ├── components/        # React components
│   │   ├── pages/        # Main page components
│   │   └── common/       # Reusable components
│   ├── context/          # React Context providers
│   ├── cloud/            # Data scraping and uploading modules
│   ├── recommender/      # ML recommendation system
│   ├── nlp/             # Natural language processing
│   └── server.py        # Flask backend server
├── requirements.txt      # Python dependencies
├── package.json         # Node.js dependencies
└── README.md           # This file
```

## 🔧 Available Scripts

### Frontend

- `npm start` - Start development server
- `npm test` - Run test suite
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### Backend

- `python src/server.py` - Start Flask server
- Automated tasks run via APScheduler:
  - Price updates every 4 hours
  - Email alerts twice daily
  - ML model updates daily

## 🔌 API Endpoints

### Authentication

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/change-password` - Change password

### Products & Shopping Lists

- `GET /api/products` - Get all products
- `POST /api/save-list` - Save shopping list
- `GET /api/user-lists` - Get user's shopping lists
- `GET /api/user-last-list` - Get user's most recent list

### Store Comparison

- `GET /api/find-nearby-stores/:listId` - Find stores within radius
- `POST /api/evaluate-supermarkets/:listId` - Compare prices across stores

### Recommendations & Alerts

- `GET /api/recommend-items` - Get AI product recommendations
- `POST /api/subscribe-to-price-drop` - Set up price alerts
- `GET /api/user-alerts` - Get user's active alerts

### Communication

- `POST /api/send-list-sms` - Send list via WhatsApp
- `GET /api/suggestions` - Get product suggestions from external APIs

## 🤖 Machine Learning Features

- **Collaborative Filtering** - User-based product recommendations
- **Content-Based Filtering** - Product similarity recommendations
- **Hybrid Approach** - Combines multiple recommendation strategies
- **User Clustering** - Groups similar users for better recommendations
- **Price Prediction** - Forecasts price trends for better alerts

## 🔒 Security & Privacy

- **Password Hashing** - bcrypt encryption for user passwords
- **SQL Injection Prevention** - Parameterized queries
- **CORS Configuration** - Controlled API access
- **Input Validation** - Server-side data sanitization
- **Environment Variables** - Secure credential management

## 🔄 Automated Background Tasks

- **Price Data Updates** - Every 4 hours from supermarket APIs
- **User Recommendations** - Daily ML model updates
- **Price Drop Alerts** - Twice daily (7 AM & 7 PM)
- **Full Database Refresh** - Monthly complete data sync

## 🌐 External Integrations

- **Israeli Supermarket Chains** - Real-time price data
- **Twilio WhatsApp API** - List sharing
- **Google Cloud MySQL** - Database hosting
- **SMTP Email Service** - Price alert notifications

## 🐛 Troubleshooting

### Logs & Debugging

- Backend logs: Check terminal running `python src/server.py`
- Frontend errors: Open browser developer console
- Database issues: Check GCP Cloud SQL logs

## 👥 Contributing

This is an academic project. For questions or issues:

1. Check existing documentation
2. Contact the project team for credentials and access
3. Review the troubleshooting section

## 📄 License

This project is developed for academic purposes as part of a university course.

---

**Note**: This application integrates with real Israeli supermarket chains and requires specific credentials for full functionality. Academic reviewers will be provided with appropriate access levels for evaluation purposes.
