const defaultStudioImages = {
    hero: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=90",
    quote: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
    journey: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85"
};

const photoStoragePrefix = "loc-haven-photo-";
const photoStatus = document.querySelector("#photo-status");

function getSavedPhoto(photoName) {
    try {
        return localStorage.getItem(`${photoStoragePrefix}${photoName}`);
    } catch {
        return null;
    }
}

function showPhotoStatus(message) {
    photoStatus.textContent = message;
    window.clearTimeout(showPhotoStatus.timeoutId);
    showPhotoStatus.timeoutId = window.setTimeout(() => {
        photoStatus.textContent = "";
    }, 3500);
}

document.querySelectorAll("[data-studio-image]").forEach((image) => {
    const photoName = image.dataset.studioImage;
    image.src = getSavedPhoto(photoName) || defaultStudioImages[photoName];
});

function compressPhoto(file) {
    return new Promise((resolve, reject) => {
        const sourceUrl = URL.createObjectURL(file);
        const sourceImage = new Image();

        sourceImage.onload = () => {
            const longestSide = 1600;
            const scale = Math.min(1, longestSide / Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(sourceImage.naturalWidth * scale);
            canvas.height = Math.round(sourceImage.naturalHeight * scale);

            const context = canvas.getContext("2d");
            URL.revokeObjectURL(sourceUrl);

            if (!context) {
                reject(new Error("Could not process this photo."));
                return;
            }

            context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.84));
        };

        sourceImage.onerror = () => {
            URL.revokeObjectURL(sourceUrl);
            reject(new Error("This photo could not be opened."));
        };

        sourceImage.src = sourceUrl;
    });
}

document.querySelectorAll("[data-photo-edit]").forEach((button) => {
    const photoName = button.dataset.photoEdit;
    const fileInput = document.querySelector(`[data-photo-input="${photoName}"]`);
    const image = document.querySelector(`[data-studio-image="${photoName}"]`);

    button.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];

        if (!file) {
            return;
        }

        try {
            const photoData = await compressPhoto(file);
            image.src = photoData;

            try {
                localStorage.setItem(`${photoStoragePrefix}${photoName}`, photoData);
                showPhotoStatus("Photo updated and saved in this browser.");
            } catch {
                showPhotoStatus("Photo updated for this visit, but could not be saved.");
            }
        } catch (error) {
            showPhotoStatus(error.message);
        }

        fileInput.value = "";
    });
});

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".nav-links");
const bookingForm = document.querySelector("#booking-form");
const serviceSelect = document.querySelector("#service");

function closeNavigation() {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    menuButton.textContent = "☰";
}

menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
    );
    menuButton.textContent = isOpen ? "×" : "☰";
});

navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
        closeNavigation();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeNavigation();
    }
});

document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
        serviceSelect.value = link.dataset.service;
    });
});

bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const message = [
        `Name: ${formData.get("name")}`,
        `Email: ${formData.get("email")}`,
        `Interested in: ${formData.get("service")}`,
        `Message: ${formData.get("message") || "No additional details."}`
    ].join("\n");

    const subject = encodeURIComponent("Loc Haven appointment inquiry");
    const body = encodeURIComponent(message);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
});