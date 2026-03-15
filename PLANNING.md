# Core features
Screenshot import - Upload references via drag and drop on desktop or directly from the phone camera roll
Intention prompt - A one-line note captured at import to record the reason behind saving a reference
Project organisation - Group references into projects to keep different work streams separate
Collection view - A visual, masonry-style grid of all saved references with notes and ta
Search & filters - Find any reference by keyword, color, tag, UI pattern, or project
Rating - Rate assets for efficient organisation

# Nice-to-have
Auto-tagging - Automatic categorisation of each image by UI pattern, color palette, and interface type
Freehand annotation - Draw and mark up directly on top of a screenshot right after importing it
Find Duplicates - Scan and Marge duplicates to save space

# Not in Scope
Colour Search - Swiftly find references within the same colour palette to quickly surface visually consistent inspiration
Plugins - Extend Refr's workflow with integrations for Figma, Notion, and Slack to bring references directly into these tools
Cloud Sync Tools - Pair with cloud sync tools to manage and access the reference collection seamlessly across devices

# User flow (green path)
1. Capture — Designer takes a screenshot naturally on their device from mobile/computer. (core)
2. Import — Screenshot is dragged in or uploaded to Refr (core)
3. Annotate — A canvas opens for optional freehand drawing on top of the image (nice-to-have)
4. Contextualise — A one-line prompt asks if the user wants to add a note when saving (core)
5. Process — AI automatically tags the image by UI type, color, and pattern (done by the user - core) (AI - nice-to-have) 
6. Organise — Reference is assigned to a project and grouped by the user (core)
7. Retrieve — Designer searches and filters the collection when they need it, they can copy or download the screenshot (core)


# Home Layout
## Left sidebar
- The sidebar is the primary navigation for organising references. It contains the following folders by default:
- All — displays every screenshot the user has uploaded, regardless of folder or category
- Uncategorised — displays screenshots that have not been assigned to any folder or category
- Trash — displays screenshots that have been deleted, allowing recovery before permanent removal
- Custom folders — users can create their own folders to organise references by project or theme. Custom folders appear below the default ones in the sidebar.

## Content Area
The main area of the screen. Displays the contents of whichever folder is currently selected in the sidebar (default: All).
References are shown in a masonry grid layout. When a user selects an image, it expands within the content area to show a larger preview. Selecting an image also triggers the right panel to open with the image's details.

## Right panel
Appears when an image is selected in the content area. Displays the metadata and context associated with that reference, including:
The intention note captured at import ("why did I save this?")
Auto-generated tags (UI pattern, color palette, type)
The project or folder it belongs to
Date saved
Any freehand annotation drawn on the image

## Adding new screenshot
When adding a new screenshot users will be able to:
- Assign to an existing project folder, create a new folder and assign or leave it unassigned. (core)
- Contextualise by adding a note when saving (core)
- Add tags the image by UI type, color, and pattern (core) 
    Categories: 
        AI, Business, Collaboration, Communication, CRM, Crypto & Web3, Developer Tools, Education, Entertainment, Finance, Food & Drink, Graphics & Design, Jobs & Recruitment, Lifestyle, Maps & Navigation, Medical, Music & Audio, News, Photo & Video, Productivity, Real Estate, Reference, Shopping, Social Networking, Sports, Travel & Transportation, Utilities
    Screens:
        - Utility: Audio Player, Audio & Video Recorder, Browser, Calendar, Call, Camera & Scanner, Chat Bot, Date & Time, Dynamic Island, Filters & Stickers, Live Activities, Location & Address, Map, Media Editor, Reminder, Timeline & History, Timer & Clock, Video Player, Widgets
        - Misc: Confetti, Dark Mode, Misc
        - Content: Article Detail, Augmented Reality, Browse & Discover, Class & Lesson Detail, Emails & Messages, Event Detail, Goal & Task, Home, News Feed, Note Detail, Other Content, Post Detail, Product Detail, Quiz, Recipe Detail, Song & Podcast Detail, Stories, TV Show & Movie Detail
        - Actions: Add & Create, Ban & Block, Cancel, Delete, Draw & Annotate, Edit, Favorite & Pin, Filter & Sort, Flag & Report, Follow & Subscribe, Invite & Refer Friends, Like & Upvote, Move, Other Action, Reorder, Save, Search, Select, Set, Schedule, Share, Transfer & Send Money, Upload & Download
        - Data: Charts, Dashboard, Progress
        - User Collections: Bookmarks & Collections, Downloads & Available Offline, Playlists, Trash & Archive
        - Communication: About, Acknowledgement & Success, Action Option, Confirmation, Empty State, Error, Feature Info, Feedback, Help & Support, Loading, Permission, Privacy Policy, Pull to Refresh
        Commerce & Finance: Billing, Cart & Bag, Checkout, Order Confirmation, Order Detail, Order History, Payment Method, Pricing, Promotions & Rewards, Shop & Storefront, Subscription & Paywall, Suggestions & Similar Items, Terms & Conditions, Wallet & Balance
        - Social: Achievements & Awards, Chat Detail, Comments, Followers & Following, Groups & Community, Invite Teammates, Leaderboard, Notifications, Reviews & Ratings, Social Feed, User / Group Profile
        New User Experience: Account Setup, Guided Tour & Tutorial, Splash Screen, Signup, Verification, Welcome & Get Started
        - Account Management: Delete & Deactivate Account, Forgot Password, Login, My Account & Profile, Settings & Preferences
    UI Elements:
        - Control: Accordion, Button, Checkbox, Color Picker, Date Picker, Floating Action Button, Radio Button, Rating Control, Search Bar, Segmented Control, Slider, Stepper, Switch, Tab, Text Field, Tile, Time Picker
        - View: Badge, Banner, Card, Carousel, Chip, Divider, Gallery, Loading Indicator, Map Pin, Progress Indicator, Side Navigation, Skeleton, Stacked List, Status Dot, Tab Bar, Table, Toolbar, Top Navigation Bar
        - Overlay: Action Sheet, Bottom Sheet, Coach Marks, Dialog, Drawer, Dropdown Menu, Full-Screen Overlay, Toast, Tooltip
        - Imagery: Avatar, Icon, Illustration, Logo, Photo
- Annotate on top of the screenshot for optional freehand drawing (nice-to-have)
