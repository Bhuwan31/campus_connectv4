# Campus Connect - University Student Social Platform (v2)

A full-stack university social platform with **Admin Panel**, **Feeling Stickers**, **Location-based Friend Suggestions**, and **Photo Lightbox**.

---

## What's New in v2

- **Admin Panel** (`admin.html`) - Only accessible to users with `is_admin = 1`
- **Feeling Stickers** - 20 free emoji feelings for posts (Happy, Excited, Studying, etc.)
- **Location Detection** - Auto-detects city via free IP geolocation API
- **Smart Friend Suggestions** - Algorithm matches by feeling, department, and location proximity
- **Photo Lightbox** - Click any post image for full-screen view with blurred background
- **Separate Profile Pages** - `view_profile.html` (public) vs `edit_profile.html` (private)
- **Announcements** - Admin-only broadcast system with priority levels

---

## Project Structure

```
campus_connect/
├── api/
│   ├── register.php              # Registration (with location)
│   ├── login.php                 # Login (returns is_admin)
│   ├── logout.php
│   ├── auth_check.php            # Returns is_admin flag
│   ├── get_user.php              # Current user data
│   ├── update_profile.php        # Update profile + feeling + location
│   ├── get_public_profile.php    # View other user's profile
│   ├── create_post.php           # Create post with feeling + location
│   ├── get_posts.php             # Get posts with feelings
│   ├── add_comment.php
│   ├── get_comments.php
│   ├── like_post.php
│   ├── get_feelings.php          # List all 20 feelings
│   ├── get_location.php          # IP-based geolocation (server-side)
│   ├── suggest_friends.php       # Smart friend matching algorithm
│   ├── create_announcement.php   # Admin only
│   └── get_announcements.php     # Public announcements
│
├── includes/
│   └── config.php                # DB config + admin helpers + feelings list
│
├── assets/
│   ├── css/style.css             # All styles including lightbox, feelings, admin
│   └── js/app.js                 # All frontend logic
│
├── uploads/
│   └── default-avatar.png
│
├── login.html
├── register.html                 # Auto-detects location on load
├── home.html                     # Feed with feelings, announcements, suggestions
├── view_profile.html             # Public profile viewing
├── edit_profile.html             # Private profile editing
├── admin.html                    # Admin dashboard
├── database.sql                  # Updated schema
└── README.md
```

---

## Setup Instructions (XAMPP)

### Step 1: Fresh Install
1. Copy `campus_connect` folder to `C:\xampp\htdocs\`
2. Start Apache and MySQL in XAMPP Control Panel

### Step 2: Import Database
1. Go to `http://localhost/phpmyadmin`
2. Create database `campus_connect` (or import `database.sql` directly)
3. Run this SQL to create the admin user:

```sql
-- Default admin account (login: admin@campus.edu / password: admin123)
INSERT INTO users (name, email, password, student_id, is_admin) 
VALUES ('Admin', 'admin@campus.edu', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN001', 1);
```

### Step 3: Set Permissions
Make `uploads/` folder writable:
```bash
# Windows: Right-click uploads folder -> Properties -> Security -> Allow Write
# Linux/Mac: chmod -R 777 uploads/
```

### Step 4: Access the App
```
http://localhost/campus_connect/register.html
```

---

## Pages

| Page | URL | Access |
|------|-----|--------|
| Register | `/register.html` | Public |
| Login | `/login.html` | Public |
| Home Feed | `/home.html` | Authenticated |
| View Profile | `/view_profile.html?user_id=123` | Authenticated |
| Edit Profile | `/edit_profile.html` | Authenticated (own profile) |
| Admin Panel | `/admin.html` | Admin only |

---

## Feeling Stickers (20 Free)

| Feeling | Emoji | Feeling | Emoji |
|---------|-------|---------|-------|
| Happy | 😊 | Studying | 📚 |
| Excited | 🤩 | Partying | 🎉 |
| Loved | 🥰 | Traveling | ✈️ |
| Blessed | 🙏 | Eating | 🍕 |
| Grateful | 😇 | Gaming | 🎮 |
| Sad | 😢 | Working Out | 💪 |
| Angry | 😠 | Coding | 💻 |
| Confused | 😕 | Listening to Music | 🎵 |
| Tired | 😴 | Watching Movie | 🎬 |
| Sick | 🤒 | Reading | 📖 |

---

## Friend Suggestion Algorithm

The algorithm calculates a **match score (0-100)** based on:

1. **Same Feeling** (+40 points) - Highest priority
2. **Same Department** (+30 points)
3. **Same/Nearby City** (+25 points) - Uses Haversine distance formula
4. **Active Poster** (+5 points) - Users with 5+ posts

Results are sorted by match score and displayed in the right sidebar.

---

## Location Detection

Uses **ipwho.is** free API (server-side via PHP cURL, no CORS issues):
- Auto-detects on registration page load
- Falls back to browser geolocation if API fails
- Stores city, latitude, longitude in database
- Used for nearby friend suggestions

---

## Admin Features

- **Create Announcements** with priority levels (Low/Normal/High)
- **View Platform Stats** (users, posts, comments, announcements)
- **Announcement Cards** appear on all users' home feed
- Admin badge shown next to admin names

---

## Security

- Password hashing with bcrypt
- PDO prepared statements
- XSS prevention with htmlspecialchars
- File upload validation (MIME, extension, size)
- Admin access verification on every admin API call
- Session-based authentication

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Admin access required" | Run the admin SQL insert in phpMyAdmin |
| Location not detected | Normal on localhost; works on live server |
| Feelings not showing | Check `api/get_feelings.php` is accessible |
| CORS errors | Must use `http://localhost/`, NOT `file://` |

---

Made for university students.
