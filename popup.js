let API_KEY = '';

async function loadApiKey() {
  try {
    const response = await fetch(chrome.runtime.getURL('CREDS'));
    const creds = await response.json();
    API_KEY = creds.YOUTUBE_API_KEY;
  } catch (error) {
    console.error('Failed to load API key:', error);
    alert('Failed to load API key. Please check CREDS file.');
  }
}

class YouTubeTagsAnalyzer {
  constructor() {
    this.initializeElements();
    this.addEventListeners();
    this.analysisResults = null;
    this.videoData = [];
  }

  initializeElements() {
    this.videoTitleInput = document.getElementById('videoTitle');
    this.analyzeBtn = document.getElementById('analyzeBtn');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.commonTags = document.getElementById('commonTags');
    this.uniqueTags = document.getElementById('uniqueTags');
    this.trendsResults = document.getElementById('trendsResults');
    this.exportBtn = document.getElementById('exportBtn');
    this.openInBrowserBtn = document.getElementById('openInBrowserBtn');
    this.analyzeTrendsBtn = document.getElementById('analyzeTrendsBtn');
  }

  addEventListeners() {
    this.analyzeBtn.addEventListener('click', () => this.startAnalysis());
    this.exportBtn.addEventListener('click', () => this.exportResults());
    this.openInBrowserBtn.addEventListener('click', () => this.openResultsInBrowser());
    this.analyzeTrendsBtn.addEventListener('click', () => this.analyzeWithGoogleTrends());
  }

  async startAnalysis() {
    const videoTitle = this.videoTitleInput.value.trim();
    if (!videoTitle) {
      alert('Please enter a video title');
      return;
    }

    if (!API_KEY) {
      await loadApiKey();
    }

    this.showLoading(true);
    try {
      const videoIds = await this.searchVideos(videoTitle);
      const tags = await this.extractTags(videoIds);
      const analysis = this.analyzeTags(tags);
      await this.displayResults(analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze tags. Please try again.');
    }
    this.showLoading(false);
  }

  async searchVideos(query) {
    // Calculate date 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const publishedAfter = oneYearAgo.toISOString();

    // First search for videos with basic criteria
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=id,snippet` +
      `&q=${encodeURIComponent(query)}` +
      `&type=video` +
      `&maxResults=50` + // Get more videos initially to filter
      `&publishedAfter=${publishedAfter}` +
      `&videoDuration=medium` + // Medium duration (4-20 minutes)
      `&order=viewCount` + // Sort by views
      `&key=${API_KEY}`
    );
    const searchData = await response.json();

    // Get detailed video information including duration and statistics
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails,statistics,snippet` +
      `&id=${videoIds}` +
      `&key=${API_KEY}`
    );
    const detailsData = await detailsResponse.json();

    // Filter videos by duration (4-20 minutes) and sort by views
    const filteredVideos = detailsData.items
      .filter(video => {
        const duration = this.parseDuration(video.contentDetails.duration);
        return duration >= 240 && duration <= 1200; // 4-20 minutes in seconds
      })
      .sort((a, b) => {
        const viewsA = parseInt(a.statistics.viewCount) || 0;
        const viewsB = parseInt(b.statistics.viewCount) || 0;
        return viewsB - viewsA;
      })
      .slice(0, 10); // Take top 10 videos

    // Store video data
    this.videoData = filteredVideos.map(video => ({
      id: video.id,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      duration: this.formatDuration(video.contentDetails.duration),
      views: parseInt(video.statistics.viewCount) || 0,
      publishedAt: new Date(video.snippet.publishedAt).toLocaleDateString()
    }));

    return this.videoData.map(video => video.id);
  }

  // Helper method to parse ISO 8601 duration to seconds
  parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Helper method to format duration for display
  formatDuration(isoDuration) {
    const duration = this.parseDuration(isoDuration);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async extractTags(videoIds) {
    const tags = [];
    for (const videoId of videoIds) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`
      );
      const data = await response.json();
      const videoTags = data.items[0]?.snippet?.tags || [];
      tags.push(...videoTags);
    }
    return tags;
  }

  analyzeTags(tags) {
    const tagFrequency = {};
    tags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });

    const sortedTags = Object.entries(tagFrequency)
      .sort(([, a], [, b]) => b - a);

    return {
      common: sortedTags.slice(0, 10),
      unique: sortedTags.filter(([, freq]) => freq === 1)
    };
  }

  async displayResults(analysis) {
    this.analysisResults = analysis;
    this.displayTagSection(this.commonTags, analysis.common, 'Most used tags:');
    this.displayTagSection(this.uniqueTags, analysis.unique, 'Unique tags:');
    
    // Display video links with stats
    const videoLinksContainer = document.createElement('div');
    videoLinksContainer.className = 'video-links';
    videoLinksContainer.innerHTML = `
      <h3>Analyzed Videos (Last Year, 4-20 min, Most Viewed):</h3>
      ${this.videoData.map(video => `
        <div class="video-link">
          <a href="${video.url}" target="_blank">${video.title}</a>
          <div class="video-stats">
            ⏱️ ${video.duration} | 
            👁️ ${this.formatNumber(video.views)} views | 
            📅 ${video.publishedAt}
          </div>
        </div>
      `).join('')}
    `;
    
    this.trendsResults.innerHTML = '';
    this.trendsResults.appendChild(videoLinksContainer);
    this.exportBtn.classList.remove('hidden');
    this.openInBrowserBtn.classList.remove('hidden');
  }

  // Helper method to format numbers
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  displayTagSection(container, tags, title) {
    container.innerHTML = '';
    tags.forEach(([tag, frequency]) => {
      const tagElement = document.createElement('div');
      tagElement.className = 'tag-item';
      tagElement.innerHTML = `${tag} <span class="tag-frequency">(${frequency})</span>`;
      container.appendChild(tagElement);
    });
  }

  showLoading(show) {
    this.loadingIndicator.classList.toggle('hidden', !show);
    this.analyzeBtn.disabled = show;
  }

  exportResults() {
    if (!this.analysisResults) return;

    const textContent = [
      'Common Tags:',
      this.analysisResults.common
        .map(([tag]) => tag)
        .join(', '),
      '',
      'Unique Tags:',
      this.analysisResults.unique
        .map(([tag]) => tag)
        .join(', '),
      '',
      'Analyzed Videos (Last Year, 4-20 min, Most Viewed):',
      ...this.videoData.map(video => 
        `${video.title} - ${video.duration} - ${this.formatNumber(video.views)} views - Published: ${video.publishedAt} - ${video.url}`
      )
    ].join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = `youtube-tags-${timestamp}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openResultsInBrowser() {
    // Store data for export
    const analysisData = {
      common: this.analysisResults.common,
      unique: this.analysisResults.unique,
      videos: this.videoData
    };

    // Safely encode the data to prevent JSON injection
    const safeAnalysisData = JSON.stringify(analysisData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>YouTube Tags Analysis Results</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          .tag-section {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .tag-item {
            display: inline-block;
            background-color: #e9ecef;
            padding: 5px 12px;
            margin: 5px;
            border-radius: 15px;
            font-size: 14px;
          }
          .tag-frequency {
            color: #666;
            font-size: 0.9em;
            margin-left: 5px;
          }
          .video-link {
            margin: 15px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
          }
          .video-link a {
            color: #0366d6;
            text-decoration: none;
            font-size: 16px;
            font-weight: 500;
          }
          .video-link a:hover {
            text-decoration: underline;
          }
          .video-stats {
            margin-top: 8px;
            color: #666;
            font-size: 14px;
          }
          h1, h2 {
            color: #24292e;
          }
          .section-title {
            border-bottom: 2px solid #e1e4e8;
            padding-bottom: 8px;
            margin: 25px 0 15px;
          }
          #exportBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          }
          #exportBtn:hover {
            background-color: #357abd;
          }
        </style>
      </head>
      <body>
        <h1>YouTube Tags Analysis Results</h1>
        
        <div class="tag-section">
          <h2 class="section-title">Most Common Tags:</h2>
          ${this.analysisResults.common.map(([tag, freq]) => 
            `<div class="tag-item">${tag} <span class="tag-frequency">(${freq})</span></div>`
          ).join('')}
        </div>

        <div class="tag-section">
          <h2 class="section-title">Unique Tags:</h2>
          ${this.analysisResults.unique.map(([tag, freq]) => 
            `<div class="tag-item">${tag} <span class="tag-frequency">(${freq})</span></div>`
          ).join('')}
        </div>

        <div class="videos-section">
          <h2 class="section-title">Analyzed Videos (Last Year, 4-20 min, Most Viewed):</h2>
          ${this.videoData.map(video => `
            <div class="video-link">
              <a href="${video.url}" target="_blank">${video.title}</a>
              <div class="video-stats">
                ⏱️ ${video.duration} | 
                👁️ ${this.formatNumber(video.views)} views | 
                📅 ${video.publishedAt}
              </div>
            </div>
          `).join('')}
        </div>

        <button id="exportBtn" onclick="exportResults()">Export Results</button>

        <script>
          // Store the analysis data - now properly escaped
          const analysisData = JSON.parse('${safeAnalysisData}');

          function formatNumber(num) {
            if (num >= 1000000) {
              return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
              return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
          }

          function exportResults() {
            const textContent = [
              'Common Tags:',
              analysisData.common.map(([tag]) => tag).join(', '),
              '',
              'Unique Tags:',
              analysisData.unique.map(([tag]) => tag).join(', '),
              '',
              'Analyzed Videos (Last Year, 4-20 min, Most Viewed):',
              ...analysisData.videos.map(video => 
                \`\${video.title} - \${video.duration} - \${formatNumber(video.views)} views - Published: \${video.publishedAt} - \${video.url}\`
              )
            ].join('\\n');

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.href = URL.createObjectURL(blob);
            link.download = \`youtube-tags-\${timestamp}.txt\`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  async analyzeWithGoogleTrends() {
    if (!this.analysisResults) {
      alert('Please analyze tags first');
      return;
    }

    try {
      // Show loading state
      this.showLoading(true);
      
      // Prepare data for Python script
      const data = {
        common: this.analysisResults.common,
        unique: this.analysisResults.unique
      };

      // Send message to background script to run Python analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeGoogleTrends',
        data: JSON.stringify(data)
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Parse and display results
      const trendsData = JSON.parse(response.result);
      
      // Create trends section if it doesn't exist
      let trendsSection = document.getElementById('googleTrendsResults');
      if (!trendsSection) {
        trendsSection = document.createElement('div');
        trendsSection.id = 'googleTrendsResults';
        this.trendsResults.appendChild(trendsSection);
      }

      // Display trends results
      trendsSection.innerHTML = `
        <h3>Google Trends Analysis:</h3>
        <div class="trends-content">
          ${trendsData.trends.split(', ').map(trend => 
            `<div class="trend-item">${trend}</div>`
          ).join('')}
        </div>
      `;

    } catch (error) {
      console.error('Google Trends analysis failed:', error);
      alert('Failed to analyze with Google Trends: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
}

// Initialize the analyzer when the popup loads
document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  new YouTubeTagsAnalyzer();
}); 