const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const API_URL = "http://127.0.0.1:8000/api/detect/yolo-realtime/";

// Set ukuran canvas
canvas.width = 640;
canvas.height = 480;

let lastDetections = [];
let isDetecting = false;
let frameInterval = 500; // waktu antar frame (ms)

// Mulai kamera
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    requestAnimationFrame(renderLoop);
    detectLoop();
  })
  .catch((err) => {
    console.error("Kamera gagal diakses", err);
  });

// Fungsi render realtime (smooth)
function renderLoop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawDetections(lastDetections);
  requestAnimationFrame(renderLoop);
}

// Fungsi deteksi setiap interval tertentu
function detectLoop() {
  setInterval(() => {
    if (isDetecting) return; // jangan tumpuk request
    isDetecting = true;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = 416;
    tmpCanvas.height = 416;
    const tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.drawImage(video, 0, 0, 416, 416);

    tmpCanvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append("frame", blob, "frame.jpg");

      fetch(API_URL, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          lastDetections = data.detections || [];
        })
        .catch((err) => {
          console.error("Gagal deteksi:", err);
        })
        .finally(() => {
          isDetecting = false;
        });
    }, "image/jpeg");
  }, frameInterval);
}

// Fungsi gambar bounding box & label
function drawDetections(detections) {
  detections.forEach((det) => {
    const [x1, y1, x2, y2] = det.bbox;
    const label = `${det.label} (${(det.confidence * 100).toFixed(1)}%)`;

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    ctx.fillStyle = "black";
    ctx.fillRect(x1, y1 - 20, ctx.measureText(label).width + 10, 20);

    ctx.fillStyle = "lime";
    ctx.font = "16px Arial";
    ctx.fillText(label, x1 + 5, y1 - 5);
  });
}
