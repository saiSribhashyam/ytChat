import fetch from 'node-fetch';

function getYouTubeVideoID(url) {
    let videoID = '';
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
        videoID = urlObj.searchParams.get('v');
    } else if (hostname === 'youtu.be') {
        videoID = urlObj.pathname.slice(1);
    }

    return videoID;
}

const getYtinfo = async (videourl) => {
    try {
        const videoId = getYouTubeVideoID(videourl);
        

        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error("YouTube API key is missing.");
        }

        const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics,status`;
        const response = await fetch(url);
    
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        if (data.items.length === 0) {
            throw new Error("No video found for the given ID.");
        }

        const vidDetails = data.items[0];
        const snippet = vidDetails.snippet;
        const author = {
            name: snippet.channelTitle,
            channelId: snippet.channelId,
            author_thumbnail: snippet.thumbnails.high.url
        };

        const vidInfo = {
            id: vidDetails.id,
            url: `https://www.youtube.com/watch?v=${vidDetails.id}`,
            title: snippet.title,
            description: snippet.description,
            author: author,
            thumbnail: snippet.thumbnails.high.url,
            author_thumbnail: snippet.thumbnails.high.url,
            //publishedAt: snippet.publishedAt,
            //tags: snippet.tags,
            //duration: vidDetails.contentDetails.duration,
            //viewCount: vidDetails.statistics.viewCount,
            //likeCount: vidDetails.statistics.likeCount,
            commentCount: vidDetails.statistics.commentCount
        };

        
        return [vidInfo, author];
    } catch (err) {
        console.error(err);
        return { error: "Something went wrong", err };
    }
};

export default getYtinfo;
