# ▶YTChat Backend

This is the backend for the YouTube Chat application. It provides endpoints to start a chat, get YouTube video information, and get video transcripts.

## Project Structure

```
.env
.github/
	workflows/
		master_ytchatbackend.yml
.gitignore
.vercel/
	project.json
	README.md
methods/
	chatbot.js
	getTranscript.js
	getYtInfo.js


package.json




server.js




vercel.json


```

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/ytchatbackend.git
    cd ytchatbackend
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your environment variables:
    ```env
    PORT=3000
    YOUTUBE_API_KEY=your_youtube_api_key
    ```

## Running the Project

### Development

To run the project in development mode with hot-reloading:
```sh
npm run dev
```

### Production

To run the project in production mode:
```sh
npm start
```

## Deployment

The backend is configured to be deployed using Vercel. Ensure you have the Vercel CLI installed and configured.

1. Deploy to Vercel:
    ```sh
    vercel
    ```

## Endpoints

### Start Chat

- **URL:** `/startchat`
- **Method:** `POST`
- **Body Parameters:**
  - `urlAddress` (string): The URL of the YouTube video.
- **Response:**
  - `200 OK`: Chat started successfully.
  - `400 Bad Request`: `urlAddress` is required.

### Get YouTube Info

- **URL:** `/getytinfo`
- **Method:** `POST`
- **Body Parameters:**
  - `urlAddress` (string): The URL of the YouTube video.
- **Response:**
  - `200 OK`: YouTube video information.
  - `400 Bad Request`: `urlAddress` is required.

### Get Transcript

- **URL:** `/gettranscript`
- **Method:** `POST`
- **Body Parameters:**
  - `urlAddress` (string): The URL of the YouTube video.
- **Response:**
  - `200 OK`: YouTube video transcript.
  - `400 Bad Request`: `urlAddress` is required.

## License

This project is licensed under the ISC License.
