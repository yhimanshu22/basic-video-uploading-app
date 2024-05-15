import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const app = express();

// Multer middleware
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));

// Body parser middleware
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Default route
app.get('/', (req, res) => {
    res.json({ message: "Hello, how are you?" });
});

// File upload route
app.post('/upload', upload.single('file'), function (req, res) {
    const lessonId = uuidv4();
    const videoPath = req.file.path;
    const outputPath = `./uploads/courses/${lessonId}`;
    const hlsPath = `${outputPath}/index.m3u8`;

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // FFmpeg command for video conversion
    const ffmpegCommand = `ffmpeg -i ${videoPath} -c:v libx264 -c:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`FFmpeg execution error: ${error}`);
            res.status(500).json({ error: 'Error converting video' });
            return;
        }

        console.log(`FFmpeg stdout: ${stdout}`);
        console.error(`FFmpeg stderr: ${stderr}`);

        const videoUrl = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`;
        res.json({
            message: "Video converted to HLS format",
            videoUrl: videoUrl,
            lessonId: lessonId,
        });
    });
});

// Start server
app.listen(8000, () => {
    console.log('Server is running on port 8000');
});
