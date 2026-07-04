# 🎓 NIELIT Test Preparation Portal

A simple, responsive, browser-based online examination portal developed for **Nootech Computer Centre** to help students prepare for **NIELIT (National Institute of Electronics & Information Technology)** examinations such as **CCC, BCC, CCC+, and ECC**.

The portal provides a clean and distraction-free examination environment by embedding a Google Form inside the website. It includes an automatic countdown timer that starts when the exam begins and ends the examination session once the allotted time expires.

---

# 📖 Table of Contents

- Overview
- Features
- Project Structure
- How It Works
- Technologies Used
- User Interface
- Configuration
- Examination Workflow
- Advantages
- Deployment
- Future Enhancements
- Developer Notes
- License

---

# 📌 Overview

This project is a lightweight, front-end-based online examination portal designed for NIELIT aspirants. Instead of creating a complete examination management system with a database and backend server, it leverages **Google Forms** for question management and response collection.

The website serves as a dedicated examination interface where students can:

- Read exam instructions
- Start the examination
- Attempt the exam inside the website
- View a live countdown timer
- Automatically end the examination after the allotted time

Since all student responses are stored directly in Google Forms, no database or backend development is required.

---

# ✨ Features

- ✅ Responsive design
- ✅ Mobile-friendly interface
- ✅ Attractive modern UI
- ✅ Animated landing page
- ✅ One-click exam launch
- ✅ Embedded Google Form
- ✅ Automatic countdown timer
- ✅ Automatic exam ending
- ✅ Lightweight project
- ✅ No backend required
- ✅ Easy customization
- ✅ Easy deployment

---

# 📂 Project Structure

```
NIELIT_Prep/
│
├── index.html              # Main examination portal
├── style.css               # Custom styles
├── Feedbacksheet.html      # Feedback page
├── Thank u.html            # Thank-you page
└── README.md               # Project documentation
```

---

# 🚀 How the Website Works

## Step 1 – User Opens the Website

When the website loads, users are presented with:

- Welcome message
- Institute details
- Exam instructions
- Countdown timer (initially not running)
- Start Exam button

At this stage, the Google Form remains hidden.

---

## Step 2 – Student Clicks "Start Exam"

When the student presses the **Start Exam** button, JavaScript performs the following actions:

- Hides the instructions
- Hides the Start Exam button
- Displays the embedded Google Form
- Starts the countdown timer

This is handled through the `openExam()` JavaScript function.

---

## Step 3 – Google Form Loads

The website embeds the Google Form using an **iframe**.

Example:

```html
<iframe src="YOUR_GOOGLE_FORM_LINK"></iframe>
```

Students complete the examination directly inside the webpage without opening another browser tab.

---

## Step 4 – Countdown Timer Starts

The timer begins counting down immediately after the exam starts.

Example:

```
60:00
59:59
59:58
59:57
...
```

The countdown updates every second using JavaScript's `setInterval()` function.

---

## Step 5 – Time Expires

Once the timer reaches **00:00**, JavaScript automatically:

- Stops the timer
- Hides the examination form
- Displays a "Time's Up" message
- Changes the timer to "Exam Ended"
- Shows an alert notifying the student

This ensures that students cannot continue the examination beyond the allotted time.

---

# 🛠 Technologies Used

The project is built entirely using front-end technologies.

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Google Forms
- Google Fonts

No frameworks or backend technologies are required.

---

# 🎨 User Interface

The application is divided into several sections.

## Hero Section

Displays:

- Welcome message
- Institute name
- Examination title
- Countdown timer

---

## Instructions Section

Contains:

- Examination instructions
- Rules
- Start Exam button

---

## Examination Section

Contains the embedded Google Form that becomes visible only after the exam starts.

---

## Timer Section

Displays the remaining examination time.

Example:

```
Exam Time: 60:00
```

---

## Footer

Displays:

- Institute branding
- Copyright information
- Social media links

---

# ⚙️ Configuration

## Change Exam Duration

Locate the following line in JavaScript:

```javascript
startTimer(60 * 60, timerDisplay);
```

Examples:

### 30 Minutes

```javascript
startTimer(30 * 60, timerDisplay);
```

### 45 Minutes

```javascript
startTimer(45 * 60, timerDisplay);
```

### 90 Minutes

```javascript
startTimer(90 * 60, timerDisplay);
```

---

## Change the Google Form

Replace:

```javascript
frame.src = "YOUR_GOOGLE_FORM_LINK";
```

with your own Google Form URL.

---

## Change Institute Name

Open:

```
index.html
```

Edit the institute name wherever it appears.

---

## Update Social Media Links

Replace the placeholder URLs with your official links.

Example:

```
Facebook
Instagram
YouTube
LinkedIn
```

---

# 📋 Examination Workflow

```
Student Opens Website
          │
          ▼
Landing Page Appears
          │
          ▼
Reads Instructions
          │
          ▼
Clicks Start Exam
          │
          ▼
Google Form Loads
          │
          ▼
Countdown Timer Starts
          │
          ▼
Student Completes Questions
          │
          ▼
Timer Reaches Zero
          │
          ▼
Exam Automatically Ends
          │
          ▼
Time-Up Message Displayed
```

---

# 💡 Advantages

- No server required
- No database required
- Easy to maintain
- Fast loading
- Secure response storage through Google Forms
- Mobile compatible
- Beginner-friendly project
- Easy customization
- Free hosting support
- Lightweight implementation

---

# 🌐 Deployment

This project can be deployed on any static hosting platform.

Supported platforms include:

- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- cPanel Shared Hosting
- Apache Server
- Nginx Server

Simply upload the project files and the website is ready to use.

---

# 🔮 Future Enhancements

Potential future improvements include:

- Student Login System
- Admin Dashboard
- Question Randomization
- Result Analysis
- Student Performance Reports
- Multiple Examination Categories
- Leaderboard
- Full-Screen Examination Mode
- Anti-Cheating Features
- Auto Submission
- Exam History
- Certificate Generation
- Dark Mode
- Multi-language Support
- AI-based Question Recommendations

---

# 👨‍💻 Developer Notes

This project follows a simple architecture by separating the examination interface from the examination content.

Instead of storing questions within the website, the project relies on **Google Forms**. This approach offers several benefits:

- Teachers can edit questions without modifying website code.
- Responses are automatically collected in Google Sheets.
- No backend development is necessary.
- Easy maintenance and updates.

The countdown timer is implemented using JavaScript and controls the visibility of the examination interface, ensuring that students only have access during the allotted time.

Because the project is entirely front-end based, it can be hosted on any static web hosting service without additional configuration.

---

# 🎯 Use Cases

This project is suitable for:

- NIELIT CCC Preparation
- BCC Preparation
- CCC+ Preparation
- ECC Preparation
- Coaching Institutes
- Schools
- Colleges
- Computer Training Centers
- Online Practice Tests
- Mock Examinations

---

# 📜 License

This project is intended for educational purposes.

You are free to modify, customize, and use it for personal, educational, or institutional purposes.

---

# 👨‍🏫 Developed By SARBAJIT SENAPATI For

**Nootech Computer Centre**

Authorized Facilitation Centre for **NIELIT (Ministry of Electronics & Information Technology, Government of India)**

Empowering students with digital education and online examination practice through modern web technologies.

---

# 🤝 Contributing

Contributions are welcome!

If you would like to improve this project:

1. Fork the repository.
2. Create a new feature branch.
3. Make your changes.
4. Commit your changes.
5. Push the branch.
6. Create a Pull Request.

Suggestions, bug reports, and feature requests are always appreciated.

---

# ⭐ Support

If you found this project helpful, consider giving it a ⭐ on GitHub. Your support encourages further development and improvements.

---

**Made with ❤️ for NIELIT Aspirants**
