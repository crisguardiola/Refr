# Core features
## Screenshot import
Upload references via drag and drop on desktop or directly from the phone camera roll
## Intention prompt
A one-line note captured at import to record the reason behind saving a reference
## Project organisation
Group references into projects to keep different work streams separate
## Collection view
A visual, masonry-style grid of all saved references with notes and ta
## Search & filters
Find any reference by keyword, color, tag, UI pattern, or project
## Rating
Rate assets for efficient organisation

# Nice-to-have
## Auto-tagging
Automatic categorisation of each image by UI pattern, color palette, and interface type
## Freehand annotation
Draw and mark up directly on top of a screenshot right after importing it
## Find Duplicates
Scan and Marge duplicates to save space

# Not in Scope
## Colour Search
Swiftly find references within the same colour palette to quickly surface visually consistent inspiration
## Plugins
Extend Refr's workflow with integrations for Figma, Notion, and Slack to bring references directly into these tools
## Cloud Sync Tools
Pair with cloud sync tools to manage and access the reference collection seamlessly across devices

# User flow

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