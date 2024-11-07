# Overview
This is a Chrome extension called "YouTube Tags Analizer"that allows you to collect and analize keywords from youtube videos. The extension will be able to interact with YouTube web pages, extract metadata, and integrate with the Google Trends API.

# Core functionality
## Basic Functionality

## 1. User Interface

- **Introduction field for video title**: Create an input field in `popup.html` where user can enter the video title.
- **Analyze button**: Add an “Analyze” button in `popup.html` that triggers the search and analysis process when clicked.
- **Display Results**: Provide a section to display results in `popup.html` to show the most frequent and unique tags extracted from the video.

## 2. Search for videos via YouTube API

@file search_in_youtube_by_link.py - examle of search by link with youtube api and python
- **Start Search**: In `popup.js`, capture the video title entered by the user and initiate a search request.
- **Request to YouTube Data API**: Send an asynchronous query to the YouTube Data API to search for videos matching the title. Get the top 10 most popular videos sorted by views and likes.
- **Extract video ID**: Process the API response to retrieve the IDs of the 10 popular videos to be used to retrieve tags.

## 3. Extract tags from video metadata

- **Request tags via YouTube API**: Use the video ID to make a second request to the YouTube Data API to retrieve each video's metadata, including tags if available.
- **Collect and remove duplicate tags**: Collect tags from all videos and remove duplicates to get a list of unique tags.

## 4. Analyzing tag frequency

- **Counting the frequency of occurrence of tags**: In `popup.js`, count how often each tag occurs among the received videos.
- **Sorting tags by frequency**: Sort tags by frequency so that the most frequently used tags are at the top of the list.
- **Display results to user**: Display unique, most frequent tags in the results section for the user to view.

## 5. Integration with Google Trends API for tag analysis

- **Server request to Google Trends**: Since the Google Trends API does not support direct client-side access, configure a server-side component (e.g., a server on Flask) to handle requests to Google Trends.
- **Sending tags for analysis**: From `popup.js`, send a list of unique tags to the server for analysis by Google Trends. The server should run queries to Google Trends for each tag, targeting YouTube searches and/or the specified region.
- **Receive and display trending data**: Retrieve analysis results from the server and display popularity information for each tag next to the tags extracted in `popup.html`.

## 6. Saving and exporting results

- **LocalStorage**: Save the final list of unique tags and data from Google Trends to `localStorage` for quick access and use within the extension.
- **Export Results**: Provide the user with the ability to download the results as a CSV or JSON file for future use. Include columns with tag names, frequency of occurrence and popularity according to Google Trends data.

# Key technologies and tools:
- HTML/CSS: for the extension interface
- JavaScript: for extension logic, web page interaction and APIs
- Chrome Extensions API: for creating the extension and accessing web pages
- YouTube Data API v3: for searching and retrieving videos
- Google Trends API (pytrends via server or native implementation): for analyzing tag popularity
- Web server: backend for processing Google Trends queries

# Main components of the extension:
- background.js - background script to control the main processes.
- content.js - script for interacting with YouTube pages.
- popup.html and popup.js - the interface that is displayed when you click on the extension icon.

## Stages of development

## 1. Interface creation

- Create `popup.html` to display the extension interface where the user can enter the name of the video.
- `popup.js` processes the user's requests, displays the tags found and the results of the analysis.

## 2. Searching for videos on YouTube

- Through `popup.js` send a request to YouTube Data API to search videos by title, get the top 10 most popular videos by views and likes.
- The API returns the video IDs, which are used to move to the next step.

## 3. Extract tags from video metadata

- Using `content.js` or a direct request to the YouTube Data API, we retrieve tags from the video metadata.
- The script checks if the `<meta name=“keywords”>` tag is present on the video pages for each of the IDs and extracts the tags.

## 4. Tag Analysis

- In `popup.js` a frequency analysis of tags is performed, duplicates are discarded and only unique tags remain.
- Tags are sorted by frequency and displayed to the user.

## 5. Request to Google Trends API to analyze tags

- **Server Query**: Queries to Google Trends are sent using a web server (such as on Flask or Express), which performs the analysis on the server and passes the results back to the extension.


## 6. Saving and uploading results

- Tag analysis results are saved in a local file (JSON).
- The user can download the results file or view the results in the interface.

# Documentation:
This is how keywords are stored in the page code
<meta name="keywords" content="набиуллина, набиуллина против чемезова, чемезов, проблемы российской оборонки">

# File structure:
/my-youtube-tags-extension
│
├─── manifest.json # Chrome extension manifest
├──── popup.html # Extension HTML interface
├──── popup.js # Processing logic in the interface
├──── background.js # Background script for processing
├──── content.js # Content script for interacting with pages
├─── styles.css # Styles for popup.html
└──── icons/ # Icons for the extension
