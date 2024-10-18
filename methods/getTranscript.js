import { YoutubeTranscript } from "youtube-transcript";

const getTranscript=async (vidId)=>{
    try{
        const content=await YoutubeTranscript.fetchTranscript(vidId)
        
        return await refineTranscript(content)
    }
    catch(err){
        console.error(err);
        return {error: "Something went wrong"};
    }
}

const refineTranscript=async (content)=>{
    try {
        let refinedTrans=""
        for(let i=0;i<content.length;i++){
            if(i>0)
                refinedTrans+=' '
            refinedTrans+=content[i].text
        }
        return refinedTrans;
    } catch (error) {
        console.error(error);
        return {error: "Something went wrong"};
    }
}

export default getTranscript;