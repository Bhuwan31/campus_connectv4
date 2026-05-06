/**
 * Campus Connect - Main JavaScript (v2)
 * Features: Admin, Feelings, Location, Friend Suggestions, Lightbox
 */

const API_BASE = 'api/';
const UPLOADS_BASE = 'uploads/';

let currentUser = null;
let postsCache = [];
let feelingsCache = [];
let selectedFeeling = null;
let userLocation = null;

// ===== AUTH UTILITIES =====
async function checkAuth() {
    try {
        const res = await fetch(API_BASE + 'auth_check.php');
        const data = await res.json();
        if (data.authenticated) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return data.user;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function requireAuth() {
    checkAuth().then(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });
}

function getCurrentUser() {
    return currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.is_admin == 1;
}

function showAlert(elementId, message, type = 'error') {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = `alert alert-${type} show`;
        setTimeout(() => el.classList.remove('show'), 5000);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getAvatarUrl(image) {
    return UPLOADS_BASE + (image || 'default-avatar.png');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== NAVBAR =====
async function initNavbar() {
    const user = await checkAuth();
    const navUser = document.getElementById('nav-user');
    const navAuth = document.getElementById('nav-auth');

    if (user) {
        if (navUser) {
            navUser.classList.remove('hidden');
            document.getElementById('nav-avatar').src = getAvatarUrl(user.profile_image);
            document.getElementById('nav-name').textContent = user.name;
        }
        if (navAuth) navAuth.classList.add('hidden');

        // Show admin link if admin
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = user.is_admin ? 'flex' : 'none';
        }
    } else {
        localStorage.removeItem('currentUser');
        if (navUser) navUser.classList.add('hidden');
        if (navAuth) navAuth.classList.remove('hidden');
    }
}

async function logout() {
    try {
        await fetch(API_BASE + 'logout.php');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    } catch (e) {
        console.error('Logout failed', e);
    }
}

// ===== AUTH PAGES =====
function initLogin() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Signing in...';

        const formData = new FormData(form);

        try {
            const res = await fetch(API_BASE + 'login.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                window.location.href = 'home.html';
            } else {
                showAlert('login-alert', data.message);
                btn.disabled = false;
                btn.textContent = 'Log In';
            }
        } catch (e) {
            showAlert('login-alert', 'Network error. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Log In';
        }
    });
}

function initRegister() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;

        if (password !== confirm) {
            showAlert('register-alert', 'Passwords do not match');
            btn.disabled = false;
            btn.textContent = 'Sign Up';
            return;
        }

        const formData = new FormData(form);

        // Add location data if selected
        if (selectedLocation) {
            formData.append('location_city', selectedLocation.city || '');
            formData.append('location_lat', selectedLocation.lat || '');
            formData.append('location_lng', selectedLocation.lng || '');
        }

        try {
            const res = await fetch(API_BASE + 'register.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                showAlert('register-alert', 'Account created! Redirecting...', 'success');
                setTimeout(() => window.location.href = 'home.html', 1500);
            } else {
                showAlert('register-alert', data.message);
                btn.disabled = false;
                btn.textContent = 'Sign Up';
            }
        } catch (e) {
            showAlert('register-alert', 'Network error. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Sign Up';
        }
    });
}

// ===== LOCATION DETECTION =====
async function detectLocation() {
    const locDisplay = document.getElementById('location-display');

    try {
        const res = await fetch(API_BASE + 'get_location.php');
        const data = await res.json();

        if (data.success && data.city && data.city !== 'Localhost') {
            userLocation = {
                city: data.city,
                region: data.region,
                country: data.country,
                lat: data.lat,
                lng: data.lng,
                flag: data.flag
            };

            if (locDisplay) {
                locDisplay.innerHTML = `<span>📍 ${data.city}, ${data.country} ${data.flag || ''}</span>`;
                locDisplay.style.display = 'block';
            }
        } else {
            // Try browser geolocation as fallback
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        userLocation = {
                            city: 'My Location',
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude
                        };
                        if (locDisplay) {
                            locDisplay.innerHTML = '<span>📍 Using device location</span>';
                            locDisplay.style.display = 'block';
                        }
                    },
                    () => {
                        if (locDisplay) locDisplay.style.display = 'none';
                    }
                );
            }
        }
    } catch (e) {
        console.log('Location detection skipped');
    }
}

// ===== FEELINGS =====
async function loadFeelings() {
    if (feelingsCache.length > 0) return feelingsCache;

    try {
        const res = await fetch(API_BASE + 'get_feelings.php');
        const data = await res.json();
        if (data.success) {
            feelingsCache = data.feelings;
            return feelingsCache;
        }
    } catch (e) {
        console.error('Failed to load feelings', e);
    }
    return [];
}

function renderFeelingSelector(containerId) {
    const container = document.getElementById(containerId);
    if (!container || feelingsCache.length === 0) return;

    container.innerHTML = `
        <div class="feeling-grid">
            ${feelingsCache.map(f => `
                <button type="button" class="feeling-item" data-name="${escapeHtml(f.name)}" data-emoji="${f.emoji}" onclick="selectFeeling('${escapeHtml(f.name)}', '${f.emoji}')">
                    <span class="emoji">${f.emoji}</span>
                    <span>${escapeHtml(f.name)}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function selectFeeling(name, emoji) {
    selectedFeeling = { name, emoji };
    const display = document.getElementById('selected-feeling-display');
    if (display) {
        display.innerHTML = `
            <span class="selected-feeling">
                ${emoji} ${name}
                <span class="remove" onclick="clearFeeling()">&times;</span>
            </span>
        `;
        display.style.display = 'block';
    }
    toggleFeelingSelector();
}

function clearFeeling() {
    selectedFeeling = null;
    const display = document.getElementById('selected-feeling-display');
    if (display) {
        display.innerHTML = '';
        display.style.display = 'none';
    }
}

function toggleFeelingSelector() {
    const selector = document.getElementById('feeling-selector');
    if (selector) {
        selector.classList.toggle('active');
    }
}

// ===== HOME PAGE =====
async function initHome() {
    requireAuth();
    await initNavbar();
    await loadSidebarProfile();
    await loadFeelings();
    renderFeelingSelector('feeling-selector');
    await loadPosts();
    await loadAnnouncements();
    await loadFriendSuggestions();
    initCreatePost();
    detectLocation();
}

async function loadSidebarProfile() {
    try {
        const res = await fetch(API_BASE + 'get_user.php');
        const data = await res.json();

        if (data.success && data.user) {
            const u = data.user;
            document.getElementById('sidebar-avatar').src = getAvatarUrl(u.profile_image);
            document.getElementById('sidebar-name').textContent = u.name;
            document.getElementById('sidebar-dept').textContent = u.department || 'No department';
            document.getElementById('sidebar-bio').textContent = u.bio || 'No bio yet';
            document.getElementById('sidebar-posts').textContent = u.post_count || 0;

            // Show feeling if set
            const feelingEl = document.getElementById('sidebar-feeling');
            if (feelingEl && u.feeling) {
                feelingEl.innerHTML = `<span class="feeling-badge"><span class="emoji">${u.feeling_emoji}</span> ${escapeHtml(u.feeling)}</span>`;
                feelingEl.style.display = 'block';
            }
        }
    } catch (e) {
        console.error('Failed to load sidebar profile', e);
    }
}

function initCreatePost() {
    const form = document.getElementById('create-post-form');
    const imageInput = document.getElementById('post-image');
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-image');
    const feelingBtn = document.getElementById('feeling-btn');

    if (feelingBtn) {
        feelingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFeelingSelector();
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            imageInput.value = '';
            preview.style.display = 'none';
            previewImg.src = '';
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Posting...';

            const formData = new FormData(form);

            // Add feeling
            if (selectedFeeling) {
                formData.append('feeling', selectedFeeling.name);
                formData.append('feeling_emoji', selectedFeeling.emoji);
            }

            // Add location
            if (selectedLocation) {
                formData.append('location_city', selectedLocation.city || '');
                formData.append('location_lat', selectedLocation.lat || '');
                formData.append('location_lng', selectedLocation.lng || '');
            }

            try {
                const res = await fetch(API_BASE + 'create_post.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    form.reset();
                    preview.style.display = 'none';
                    clearFeeling();
                    await loadPosts();
                } else {
                    alert(data.message);
                }
            } catch (e) {
                alert('Failed to create post');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Post';
            }
        });
    }
}

async function loadPosts() {
    const container = document.getElementById('posts-feed');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading posts...</div>';

    try {
        const res = await fetch(API_BASE + 'get_posts.php');
        const data = await res.json();

        if (data.success) {
            postsCache = data.posts;
            renderPosts(data.posts);
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No posts yet</h3><p>Be the first to share something!</p></div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load posts</h3><p>Please refresh the page</p></div>';
    }
}

function renderPosts(posts) {
    const container = document.getElementById('posts-feed');
    if (!posts.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No posts yet</h3><p>Be the first to share something!</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => createPostHTML(post)).join('');
    posts.forEach(post => initPostInteractions(post.id));
}

function createPostHTML(post) {
    const hasImage = post.image ? `<img src="${UPLOADS_BASE}${post.image}" class="card-image" alt="Post image" onclick="openLightboxByPostId(${post.id})">` : '';
    const likeClass = post.user_liked ? 'liked' : '';

    const feelingHtml = post.feeling ? `
        <div class="feeling-badge">
            <span class="emoji">${post.feeling_emoji}</span>
            ${escapeHtml(post.feeling)}
        </div>
    ` : '';

    const locationHtml = post.location_city ? `
        <div class="post-location">
            <span class="flag">${post.location_flag || '📍'}</span>
            <span>${escapeHtml(post.location_city)}</span>
        </div>
    ` : '';

    return `
        <div class="card" id="post-${post.id}">
            <div class="card-header">
                <img src="${getAvatarUrl(post.user_image)}" class="card-avatar" alt="${escapeHtml(post.user_name)}">
                <div class="card-meta">
                    <a href="view_profile.html?user_id=${post.user_id}" class="card-author">${escapeHtml(post.user_name)}</a>
                    <div class="card-time">${formatTime(post.created_at)}</div>
                </div>
            </div>
            <div class="card-body">
                ${feelingHtml}
                ${locationHtml}
                <div class="card-text">${escapeHtml(post.content)}</div>
                ${hasImage}
            </div>
            <div class="card-actions">
                <button class="card-btn ${likeClass}" onclick="toggleLike(${post.id})">
                    <span>${post.user_liked ? '❤️' : '🤍'}</span>
                    <span id="like-count-${post.id}">${post.like_count || 0}</span>
                </button>
                <button class="card-btn" onclick="focusComment(${post.id})">
                    <span>💬</span>
                    <span id="comment-count-${post.id}">${post.comment_count || 0}</span>
                </button>
                <button class="card-btn">
                    <span>↗️</span>
                    <span>Share</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}">
                <div class="comments-list" id="comments-list-${post.id}">
                    <div class="loading" style="padding: 20px;"><div class="spinner" style="width: 24px; height: 24px;"></div></div>
                </div>
                <div class="comment-input-area">
                    <img src="${getAvatarUrl(getCurrentUser()?.profile_image)}" class="comment-avatar" alt="You">
                    <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." onkeypress="if(event.key==='Enter') submitComment(${post.id})">
                    <button class="comment-submit" onclick="submitComment(${post.id})">➤</button>
                </div>
            </div>
        </div>
    `;
}

function initPostInteractions(postId) {
    loadComments(postId);
}

async function toggleLike(postId) {
    try {
        const formData = new FormData();
        formData.append('post_id', postId);

        const res = await fetch(API_BASE + 'like_post.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            const btn = document.querySelector(`#post-${postId} .card-btn:first-child`);
            const countEl = document.getElementById(`like-count-${postId}`);

            if (data.liked) {
                btn.classList.add('liked');
                btn.querySelector('span:first-child').textContent = '❤️';
            } else {
                btn.classList.remove('liked');
                btn.querySelector('span:first-child').textContent = '🤍';
            }
            countEl.textContent = data.like_count;
        }
    } catch (e) {
        console.error('Like failed', e);
    }
}

function focusComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) input.focus();
}

async function submitComment(postId, parentId = null) {
    const inputId = parentId ? `reply-input-${parentId}` : `comment-input-${postId}`;
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;

    const content = input.value.trim();
    input.disabled = true;

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('content', content);
    if (parentId) formData.append('parent_id', parentId);

    try {
        const res = await fetch(API_BASE + 'add_comment.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            input.value = '';
            await loadComments(postId);
            const countEl = document.getElementById(`comment-count-${postId}`);
            if (countEl) {
                const current = parseInt(countEl.textContent) || 0;
                countEl.textContent = current + 1;
            }
            if (parentId) {
                const replyForm = document.getElementById(`reply-form-${parentId}`);
                if (replyForm) replyForm.classList.remove('active');
            }
        }
    } catch (e) {
        console.error('Comment failed', e);
    } finally {
        input.disabled = false;
    }
}

async function loadComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    if (!container) return;

    try {
        const res = await fetch(API_BASE + `get_comments.php?post_id=${postId}`);
        const data = await res.json();

        if (data.success) {
            container.innerHTML = renderComments(data.comments, postId);
        } else {
            container.innerHTML = '';
        }
    } catch (e) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">Failed to load comments</p>';
    }
}

function renderComments(comments, postId, level = 0) {
    if (!comments || !comments.length) return '';

    return comments.map(comment => {
        const repliesHtml = comment.replies && comment.replies.length 
            ? `<div class="comment-replies">${renderComments(comment.replies, postId, level + 1)}</div>` 
            : '';

        return `
            <div class="comment" id="comment-${comment.id}">
                <img src="${getAvatarUrl(comment.user_image)}" class="comment-avatar" alt="${escapeHtml(comment.user_name)}">
                <div class="comment-body">
                    <div class="comment-bubble">
                        <a href="view_profile.html?user_id=${comment.user_id}" class="comment-author">${escapeHtml(comment.user_name)}</a>
                        <div class="comment-text">${escapeHtml(comment.content)}</div>
                    </div>
                    <div class="comment-actions">
                        <button class="comment-action" onclick="showReplyForm(${comment.id}, ${postId})">Reply</button>
                        <span class="comment-time">${formatTime(comment.created_at)}</span>
                    </div>
                    <div class="reply-form" id="reply-form-${comment.id}">
                        <input type="text" class="comment-input" id="reply-input-${comment.id}" placeholder="Write a reply..." onkeypress="if(event.key==='Enter') submitComment(${postId}, ${comment.id})">
                        <button class="comment-submit" onclick="submitComment(${postId}, ${comment.id})">➤</button>
                    </div>
                    ${repliesHtml}
                </div>
            </div>
        `;
    }).join('');
}

function showReplyForm(commentId, postId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.classList.toggle('active');
        if (form.classList.contains('active')) {
            setTimeout(() => document.getElementById(`reply-input-${commentId}`)?.focus(), 100);
        }
    }
}

// ===== ANNOUNCEMENTS =====
async function loadAnnouncements() {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    try {
        const res = await fetch(API_BASE + 'get_announcements.php');
        const data = await res.json();

        if (data.success && data.announcements.length > 0) {
            container.innerHTML = data.announcements.map(a => `
                <div class="announcement-card ${a.priority}">
                    <div class="announcement-header">
                        <span class="announcement-priority ${a.priority}">${a.priority}</span>
                        <span style="font-weight: 600;">${escapeHtml(a.title)}</span>
                    </div>
                    <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">${escapeHtml(a.content)}</p>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
                        By ${escapeHtml(a.admin_name)} · ${formatTime(a.created_at)}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; text-align: center; padding: 20px;">No announcements yet</p>';
        }
    } catch (e) {
        container.innerHTML = '';
    }
}

// ===== FRIEND SUGGESTIONS =====
async function loadFriendSuggestions() {
    const container = document.getElementById('suggestions-container');
    if (!container) return;

    try {
        const res = await fetch(API_BASE + 'suggest_friends.php');
        const data = await res.json();

        if (data.success && data.suggestions.length > 0) {
            container.innerHTML = data.suggestions.map(s => `
                <div class="suggestion-card" onclick="window.location.href='view_profile.html?user_id=${s.id}'">
                    <img src="${getAvatarUrl(s.profile_image)}" class="suggestion-avatar" alt="${escapeHtml(s.name)}">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${escapeHtml(s.name)}</div>
                        <div class="suggestion-meta">${escapeHtml(s.department || 'Student')}</div>
                        <div class="suggestion-reasons">
                            ${s.match_reasons.map(r => `<span class="suggestion-reason">${escapeHtml(r)}</span>`).join('')}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div class="suggestion-score">${s.match_score}%</div>
                        <button class="suggestion-btn" onclick="event.stopPropagation(); alert('Friend request sent!')">Add</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px; text-align: center; padding: 20px;">No suggestions yet. Complete your profile!</p>';
        }
    } catch (e) {
        container.innerHTML = '';
    }
}



// ===== LOCATION PICKER (Manual Selection via Nominatim) =====
let selectedLocation = null;
let locationSearchTimeout = null;

function initLocationPicker(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(locationSearchTimeout);
        dropdown.innerHTML = '<div class="location-loading"><div class="spinner"></div>Searching...</div>';
        dropdown.classList.add('active');

        if (query.length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        locationSearchTimeout = setTimeout(() => {
            searchLocation(query, dropdown, onSelect);
        }, 500);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Open dropdown on focus
    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2) {
            dropdown.classList.add('active');
        }
    });
}

async function searchLocation(query, dropdown, onSelect) {
    try {
        const res = await fetch(API_BASE + `search_location.php?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.results && data.results.length > 0) {
            dropdown.innerHTML = data.results.map(loc => `
                <div class="location-item" onclick="selectLocationFromPicker(${JSON.stringify(loc).replace(/"/g, '&quot;')}, '${dropdown.id}')">
                    <span class="flag">${loc.flag || '📍'}</span>
                    <div class="info">
                        <div class="name">${escapeHtml(loc.name)}</div>
                        <div class="meta">${escapeHtml(loc.full_name)}</div>
                    </div>
                    <span class="type">${escapeHtml(loc.type)}</span>
                </div>
            `).join('');

            // Store callback for onclick
            window._locationCallbacks = window._locationCallbacks || {};
            window._locationCallbacks[dropdown.id] = onSelect;
        } else {
            dropdown.innerHTML = '<div class="location-empty">No locations found. Try a different search.</div>';
        }
    } catch (e) {
        dropdown.innerHTML = '<div class="location-empty">Search failed. Please try again.</div>';
    }
}

function selectLocationFromPicker(loc, dropdownId) {
    selectedLocation = {
        city: loc.name,
        country: loc.country,
        flag: loc.flag,
        lat: loc.lat,
        lng: loc.lng,
        full_name: loc.full_name
    };

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.remove('active');

    // Update input
    const input = dropdown.previousElementSibling?.querySelector('.location-input') || 
                  document.querySelector(`[data-dropdown="${dropdownId}"]`);
    if (input) input.value = loc.name + (loc.country ? ', ' + loc.country : '');

    // Show selected badge
    const displayId = dropdownId.replace('-dropdown', '-display');
    const display = document.getElementById(displayId);
    if (display) {
        display.innerHTML = `
            <span class="selected-location">
                <span>${loc.flag || '📍'}</span>
                <span>${escapeHtml(loc.name)}${loc.country ? ', ' + escapeHtml(loc.country) : ''}</span>
                <span class="remove" onclick="clearSelectedLocation('${dropdownId}')">&times;</span>
            </span>
        `;
        display.style.display = 'block';
    }

    // Call stored callback
    if (window._locationCallbacks && window._locationCallbacks[dropdownId]) {
        window._locationCallbacks[dropdownId](selectedLocation);
    }
}

function clearSelectedLocation(dropdownId) {
    selectedLocation = null;

    const displayId = dropdownId.replace('-dropdown', '-display');
    const display = document.getElementById(displayId);
    if (display) {
        display.innerHTML = '';
        display.style.display = 'none';
    }

    const input = document.querySelector(`[data-dropdown="${dropdownId}"]`) ||
                  document.querySelector(`#${dropdownId}`)?.previousElementSibling?.querySelector('.location-input');
    if (input) input.value = '';
}

// ===== USE CURRENT LOCATION (Browser Geolocation) =====
function useCurrentLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    const btn = document.getElementById('use-current-location-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '📡 Detecting...';
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Reverse geocode to get city name
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
                    headers: { 'User-Agent': 'CampusConnect/1.0' }
                });
                const data = await res.json();

                const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
                const country = data.address?.country || '';
                const countryCode = data.address?.country_code || '';

                let flag = '';
                if (countryCode) {
                    const cc = countryCode.toUpperCase();
                    flag = String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65);
                }

                selectedLocation = {
                    city: city,
                    country: country,
                    flag: flag,
                    lat: lat,
                    lng: lng,
                    full_name: data.display_name || city
                };

                // Update display
                const display = document.getElementById('location-display');
                if (display) {
                    display.innerHTML = `
                        <span class="selected-location">
                            <span>${flag || '📍'}</span>
                            <span>${escapeHtml(city)}${country ? ', ' + escapeHtml(country) : ''}</span>
                            <span class="remove" onclick="clearSelectedLocation('location-dropdown')">&times;</span>
                        </span>
                    `;
                    display.style.display = 'block';
                }

                // Update input
                const input = document.getElementById('location-input');
                if (input) input.value = city + (country ? ', ' + country : '');

            } catch (e) {
                // Fallback: just use coordinates
                selectedLocation = {
                    city: 'My Location',
                    lat: lat,
                    lng: lng,
                    full_name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                };
            }

            if (btn) {
                btn.disabled = false;
                btn.textContent = '📍 Use My Location';
            }
        },
        (error) => {
            alert('Could not get your location: ' + error.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📍 Use My Location';
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ===== LIGHTBOX =====
function openLightbox(imageSrc, postData) {
    closeLightbox();

    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.id = 'lightbox-overlay';

    const authorHtml = postData ? `
        <div class="lightbox-author">
            <img src="${getAvatarUrl(postData.user_image)}" alt="${escapeHtml(postData.user_name)}">
            <div>
                <div class="lightbox-author-name">${escapeHtml(postData.user_name)}</div>
                <div class="lightbox-author-time">${formatTime(postData.created_at)}</div>
            </div>
        </div>
    ` : '';

    const captionHtml = postData && postData.content ? `
        <div class="lightbox-caption">${escapeHtml(postData.content)}</div>
    ` : '';

    overlay.innerHTML = `
        <div class="lightbox-container">
            <button class="lightbox-close" onclick="closeLightbox()" title="Close">&times;</button>
            ${authorHtml}
            <img src="${imageSrc}" class="lightbox-image" alt="Full image">
            ${captionHtml}
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('lightbox-open');

    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeLightbox();
    });

    document.addEventListener('keydown', handleLightboxKey);
}

function openLightboxByPostId(postId) {
    const post = postsCache.find(p => p.id == postId);
    if (post && post.image) {
        openLightbox(UPLOADS_BASE + post.image, post);
    }
}

function closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.classList.remove('lightbox-open');
        document.removeEventListener('keydown', handleLightboxKey);
        setTimeout(() => overlay.remove(), 300);
    }
}

function handleLightboxKey(e) {
    if (e.key === 'Escape') closeLightbox();
}

// ===== VIEW PROFILE PAGE =====
async function initViewProfile() {
    requireAuth();
    await initNavbar();

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user_id');

    if (!userId) {
        window.location.href = 'home.html';
        return;
    }

    // If viewing own profile, redirect to edit
    const me = getCurrentUser();
    if (me && me.id == userId) {
        window.location.href = 'edit_profile.html';
        return;
    }

    try {
        const res = await fetch(API_BASE + `get_public_profile.php?user_id=${userId}`);
        const data = await res.json();

        if (!data.success) {
            window.location.href = 'home.html';
            return;
        }

        const u = data.user;
        const posts = data.posts;

        document.getElementById('view-avatar').src = getAvatarUrl(u.profile_image);
        document.getElementById('view-name').textContent = u.name;
        document.getElementById('view-dept').textContent = u.department || 'Student';
        document.getElementById('view-bio').textContent = u.bio || 'No bio yet';
        document.getElementById('view-student-id').textContent = u.student_id;
        document.getElementById('view-joined').textContent = 'Joined ' + new Date(u.created_at).toLocaleDateString();
        document.getElementById('view-posts-count').textContent = posts.length;

        // Feeling
        const feelingEl = document.getElementById('view-feeling');
        if (u.feeling) {
            feelingEl.innerHTML = `<span class="view-profile-feeling"><span>${u.feeling_emoji}</span> ${escapeHtml(u.feeling)}</span>`;
            feelingEl.style.display = 'block';
        } else {
            feelingEl.style.display = 'none';
        }

        // Render posts
        const postsContainer = document.getElementById('view-posts');
        if (posts.length === 0) {
            postsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No posts yet</h3></div>';
        } else {
            postsContainer.innerHTML = posts.map(p => `
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-body" style="padding: 16px;">
                        ${p.feeling ? `<div class="feeling-badge"><span class="emoji">${p.feeling_emoji}</span> ${escapeHtml(p.feeling)}</div>` : ''}
                        <div class="card-text">${escapeHtml(p.content)}</div>
                        ${p.image ? `<img src="${UPLOADS_BASE}${p.image}" class="card-image" style="margin-top: 8px;" onclick="openLightbox('${UPLOADS_BASE}${p.image}', {user_name: '${escapeHtml(u.name)}', user_image: '${u.profile_image}', created_at: '${p.created_at}', content: '${escapeHtml(p.content)}'})">` : ''}
                    </div>
                    <div class="card-actions">
                        <span style="color: var(--text-secondary); font-size: 13px; padding: 8px 16px;">
                            💬 ${p.comment_count || 0} · ❤️ ${p.like_count || 0} · ${formatTime(p.created_at)}
                        </span>
                    </div>
                </div>
            `).join('');
        }

    } catch (e) {
        console.error('Failed to load profile', e);
        window.location.href = 'home.html';
    }
}

// ===== EDIT PROFILE PAGE =====
async function initEditProfile() {
    requireAuth();
    await initNavbar();
    await loadFeelings();
    renderFeelingSelector('feeling-selector-edit');
    detectLocation();

    try {
        const res = await fetch(API_BASE + 'get_user.php');
        const data = await res.json();

        if (data.success && data.user) {
            const u = data.user;

            document.getElementById('edit-avatar-preview').src = getAvatarUrl(u.profile_image);
            document.getElementById('edit-name').value = u.name;
            document.getElementById('edit-dept').value = u.department || '';
            document.getElementById('edit-bio').value = u.bio || '';
            const cityInput = document.getElementById('edit-city');
            if (cityInput) cityInput.value = u.location_city || '';

            // Show current feeling
            if (u.feeling) {
                selectedFeeling = { name: u.feeling, emoji: u.feeling_emoji };
                const display = document.getElementById('selected-feeling-edit');
                if (display) {
                    display.innerHTML = `<span class="selected-feeling"><span>${u.feeling_emoji}</span> ${escapeHtml(u.feeling)}<span class="remove" onclick="clearFeelingEdit()">&times;</span></span>`;
                    display.style.display = 'block';
                }
            }
        }
    } catch (e) {
        console.error('Failed to load profile', e);
    }

    // Image preview
    const imageInput = document.getElementById('edit-avatar-input');
    const preview = document.getElementById('edit-avatar-preview');

    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { preview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }

    // Feeling selector toggle
    const feelingBtn = document.getElementById('feeling-btn-edit');
    if (feelingBtn) {
        feelingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const selector = document.getElementById('feeling-selector-edit');
            if (selector) selector.classList.toggle('active');
        });
    }

    // Form submit
    const form = document.getElementById('edit-profile-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            const formData = new FormData(form);

            if (selectedFeeling) {
                formData.append('feeling', selectedFeeling.name);
                formData.append('feeling_emoji', selectedFeeling.emoji);
            }

            if (selectedLocation) {
                formData.append('location_city', selectedLocation.city || '');
                formData.append('location_lat', selectedLocation.lat || '');
                formData.append('location_lng', selectedLocation.lng || '');
            } else {
                const cityInput = document.getElementById('edit-city');
                if (cityInput && cityInput.value) {
                    formData.append('location_city', cityInput.value);
                }
            }

            try {
                const res = await fetch(API_BASE + 'update_profile.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    showAlert('profile-alert', 'Profile updated successfully!', 'success');
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    await initNavbar();
                } else {
                    showAlert('profile-alert', data.message);
                }
            } catch (e) {
                showAlert('profile-alert', 'Update failed');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        });
    }
}

function selectFeelingEdit(name, emoji) {
    selectedFeeling = { name, emoji };
    const display = document.getElementById('selected-feeling-edit');
    if (display) {
        display.innerHTML = `<span class="selected-feeling">${emoji} ${name}<span class="remove" onclick="clearFeelingEdit()">&times;</span></span>`;
        display.style.display = 'block';
    }
    const selector = document.getElementById('feeling-selector-edit');
    if (selector) selector.classList.remove('active');
}

function clearFeelingEdit() {
    selectedFeeling = null;
    const display = document.getElementById('selected-feeling-edit');
    if (display) {
        display.innerHTML = '';
        display.style.display = 'none';
    }
}

// ===== ADMIN PANEL =====
async function initAdmin() {
    requireAuth();
    await initNavbar();

    if (!isAdmin()) {
        window.location.href = 'home.html';
        return;
    }

    loadAdminStats();
    initAnnouncementForm();
}

async function loadAdminStats() {
    try {
        const db = await fetch(API_BASE + 'get_posts.php');
        const postsData = await db.json();

        // Simple stats - in production you'd have dedicated endpoints
        document.getElementById('admin-stats').innerHTML = `
            <div class="stat-card">
                <h3>👥</h3>
                <p>Users</p>
            </div>
            <div class="stat-card">
                <h3>📝</h3>
                <p>Posts</p>
            </div>
            <div class="stat-card">
                <h3>💬</h3>
                <p>Comments</p>
            </div>
            <div class="stat-card">
                <h3>📢</h3>
                <p>Announcements</p>
            </div>
        `;
    } catch (e) {
        console.error('Stats load failed', e);
    }
}

function initAnnouncementForm() {
    const form = document.getElementById('announcement-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Posting...';

        const formData = new FormData(form);

        try {
            const res = await fetch(API_BASE + 'create_announcement.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                showAlert('admin-alert', 'Announcement posted!', 'success');
                form.reset();
                loadAnnouncements();
            } else {
                showAlert('admin-alert', data.message);
            }
        } catch (e) {
            showAlert('admin-alert', 'Failed to post announcement');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Post Announcement';
        }
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        initLogin();
        initNavbar();
    } else if (path.includes('register.html')) {
        initRegister();
        initNavbar();
    } else if (path.includes('home.html')) {
        initHome();
    } else if (path.includes('view_profile.html')) {
        initViewProfile();
    } else if (path.includes('edit_profile.html')) {
        initEditProfile();
    } else if (path.includes('admin.html')) {
        initAdmin();
    }
});
