class ModalMoveable {
    constructor(modal, handle = null) {
        this.modal =
            typeof modal === "string"
                ? document.querySelector(modal)
                : modal;

        if (!this.modal) return;

        this.handle =
            handle
                ? (typeof handle === "string"
                    ? this.modal.querySelector(handle)
                    : handle)
                : this.modal.firstElementChild;

        if (!this.handle) return;

        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.init();
    }

    init() {
        this.handle.style.cursor = "move";

        this.handle.addEventListener(
            "mousedown",
            this.startDrag.bind(this)
        );

        document.addEventListener(
            "mousemove",
            this.drag.bind(this)
        );

        document.addEventListener(
            "mouseup",
            this.stopDrag.bind(this)
        );
    }

    startDrag(e) {
        if (e.target.closest("button")) return;

        const rect =
            this.modal.getBoundingClientRect();

        this.modal.style.position = "fixed";
        this.modal.style.left = rect.left + "px";
        this.modal.style.top = rect.top + "px";
        this.modal.style.margin = "0";
        this.modal.style.transform = "none";

        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        this.dragging = true;
    }

    drag(e) {
    if (!this.dragging) return;

     e.preventDefault();

    const margin = 100;

    let left = e.clientX - this.offsetX;
    let top = e.clientY - this.offsetY;

    const modalWidth = this.modal.offsetWidth;
    const modalHeight = this.modal.offsetHeight;

    // Top: don't go above the window
    top = Math.max(0, top);

    // Left: always keep 20px visible
    left = Math.max(-(modalWidth - margin), left);

    // Right: always keep 20px visible
    left = Math.min(window.innerWidth - margin, left);

    // Bottom: always keep 20px visible
    top = Math.min(window.innerHeight - margin, top);

    this.modal.style.left = left + "px";
    this.modal.style.top = top + "px";
}

resetPosition() {
    this.modal.style.position = "";
    this.modal.style.left = "";
    this.modal.style.top = "";
    this.modal.style.margin = "";
    this.modal.style.transform = "";

    this.dragging = false;
}

    stopDrag() {
        this.dragging = false;
    }
}