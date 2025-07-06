window.API_BASE_URL = "http://127.0.0.1:8000/api";

function scanCamera() {
  return {
    video: null,
    canvas: null,
    ctx: null,
    API_URL: `${window.API_BASE_URL}/detect/yolo-realtime/`,
    lastDetections: [],
    isDetecting: false,
    frameInterval: 500,
    detectIntervalId: null,
    scanning: false,

    startScan() {
      this.video = this.$refs.video;
      this.canvas = this.$refs.canvas;
      this.ctx = this.canvas.getContext("2d");

      this.canvas.width = 640;
      this.canvas.height = 480;

      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.play();
          this.scanning = true;
          requestAnimationFrame(this.renderLoop.bind(this));
          this.detectIntervalId = setInterval(
            this.detectFrame.bind(this),
            this.frameInterval
          );
        })
        .catch((err) => {
          console.error("Kamera gagal diakses", err);
          Swal.fire("Akses Kamera Gagal", "Periksa izin kamera.", "error");
        });
    },

    stopScan() {
      if (this.video?.srcObject) {
        this.video.srcObject.getTracks().forEach((track) => track.stop());
      }
      clearInterval(this.detectIntervalId);
      this.scanning = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    renderLoop() {
      if (!this.scanning) return;
      this.ctx.drawImage(
        this.video,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
      this.drawDetections();
      requestAnimationFrame(this.renderLoop.bind(this));
    },

    detectFrame() {
      if (this.isDetecting || !this.video) return;
      this.isDetecting = true;

      const tmpCanvas = document.createElement("canvas");
      tmpCanvas.width = 416;
      tmpCanvas.height = 416;
      const tmpCtx = tmpCanvas.getContext("2d");
      tmpCtx.drawImage(this.video, 0, 0, 416, 416);

      tmpCanvas.toBlob((blob) => {
        const formData = new FormData();
        formData.append("frame", blob, "frame.jpg");

        fetch(this.API_URL, {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            this.lastDetections = data.detections || [];
          })
          .catch((err) => {
            console.error("Gagal deteksi:", err);
          })
          .finally(() => {
            this.isDetecting = false;
          });
      }, "image/jpeg");
    },

    drawDetections() {
      this.lastDetections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox;
        const label = `${det.label} (${(det.confidence * 100).toFixed(1)}%)`;

        this.ctx.strokeStyle = "lime";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(
          x1,
          y1 - 20,
          this.ctx.measureText(label).width + 10,
          20
        );

        this.ctx.fillStyle = "lime";
        this.ctx.font = "16px Arial";
        this.ctx.fillText(label, x1 + 5, y1 - 5);
      });
    },
  };
}
