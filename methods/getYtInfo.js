import ytdl from "ytdl-core";
import fs from 'fs';

const getYtinfo=async (url)=>{
   try {let information=await ytdl.getInfo(url);
    const vidDetails=information.videoDetails;
    const author = vidDetails.author;
    const vidInfo={
        id:vidDetails.videoId,
        url:vidDetails.video_url,
        title:vidDetails.title,
        description: vidDetails.description,
        author:vidDetails.author,
        author_thumbnail:author.thumbnails[author.thumbnails.length-1].url,
        thumbnail: vidDetails.thumbnails[vidDetails.thumbnails.length - 1].url
    }

    return [vidInfo,author];
}
    catch(err){
        console.error(err);
        return {error: "Something went wrong"};
    }

}

export default getYtinfo;