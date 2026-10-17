const defaultStudioImages = {
    hero: "assets/hero.jpg",
    quote: "assets/quote.jpg",
    journey: "assets/journey.jpg"
};

const photoStoragePrefix = "loc-haven-photo-";
const photoDatabaseName = "loc-haven";
const photoStoreName = "studio-photos";
const photoStatus = document.querySelector("#photo-status");
const isPublishedSite = window.location.hostname === "karanjatrizah28-ai.github.io";

document.body.classList.toggle("public-site", isPublishedSite);

function openPhotoDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("Persistent photo storage is not available in this browser."));
            return;
        }

        const request = window.indexedDB.open(photoDatabaseName, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(photoStoreName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open photo storage."));
        request.onblocked = () => reject(new Error("Photo storage is blocked by another browser tab."));
    });
}

async function readStoredPhoto(photoName) {
    const database = await openPhotoDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(photoStoreName, "readonly");
        const request = transaction.objectStore(photoStoreName).get(photoName);
        let photoData = null;

        request.onsuccess = () => {
            photoData = request.result || null;
        };
        transaction.oncomplete = () => {
            database.close();
            resolve(photoData);
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Could not read the saved photo."));
        };
        transaction.onabort = () => {
            database.close();
            reject(transaction.error || new Error("Could not read the saved photo."));
        };
    });
}

async function writeStoredPhoto(photoName, photoData) {
    const database = await openPhotoDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(photoStoreName, "readwrite");
        transaction.objectStore(photoStoreName).put(photoData, photoName);
        transaction.oncomplete = () => {
            database.close();
            resolve();
        };
        transaction.onerror = () => {
            database.close();
            reject(transaction.error || new Error("Could not save the photo."));
        };
        transaction.onabort = () => {
            database.close();
            reject(transaction.error || new Error("Could not save the photo."));
        };
    });
}

function getLegacyPhoto(photoName) {
    try {
        return localStorage.getItem(`${photoStoragePrefix}${photoName}`);
    } catch {
        return null;
    }
}

async function getSavedPhoto(photoName) {
    try {
        const savedPhoto = await readStoredPhoto(photoName);
        return savedPhoto || getLegacyPhoto(photoName);
    } catch (error) {
        const legacyPhoto = getLegacyPhoto(photoName);
        if (legacyPhoto) {
            return legacyPhoto;
        }
        throw error;
    }
}

function showPhotoStatus(message) {
    photoStatus.textContent = message;
    window.clearTimeout(showPhotoStatus.timeoutId);
    showPhotoStatus.timeoutId = window.setTimeout(() => {
        photoStatus.textContent = "";
    }, 3500);
}

const photoRevisions = new Map();

document.querySelectorAll("[data-studio-image]").forEach(async (image) => {
    const photoName = image.dataset.studioImage;
    photoRevisions.set(photoName, 0);
    const revision = photoRevisions.get(photoName);
    image.src = defaultStudioImages[photoName];

    if (!isPublishedSite) {
        try {
            const savedPhoto = await getSavedPhoto(photoName);
            if (savedPhoto && photoRevisions.get(photoName) === revision) {
                image.src = savedPhoto;
            }
        } catch (error) {
            showPhotoStatus(error.message);
        }
    }
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

if (!isPublishedSite) {
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

            const revision = (photoRevisions.get(photoName) || 0) + 1;
            photoRevisions.set(photoName, revision);

            try {
                const photoData = await compressPhoto(file);
                if (photoRevisions.get(photoName) !== revision) {
                    return;
                }

                image.src = photoData;

                try {
                    await writeStoredPhoto(photoName, photoData);
                    try {
                        localStorage.removeItem(`${photoStoragePrefix}${photoName}`);
                    } catch {
                        // A stale legacy photo does not override the IndexedDB copy.
                    }
                    showPhotoStatus("Photo updated and saved in this browser.");
                } catch (storageError) {
                    try {
                        localStorage.setItem(`${photoStoragePrefix}${photoName}`, photoData);
                        showPhotoStatus("Photo saved in this browser's fallback storage.");
                    } catch {
                        throw new Error(`Photo changed for this visit, but could not be saved: ${storageError.message}`);
                    }
                }
            } catch (error) {
                showPhotoStatus(error.message);
            }

            fileInput.value = "";
        });
    });
});

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".nav-links");
const bookingForm = document.querySelector("#booking-form");
const serviceSelect = document.querySelector("#service");
const shareSiteLink = document.querySelector("#share-site-link");

const isPublicHttpPage = (window.location.protocol === "http:" || window.location.protocol === "https:")
    && window.location.hostname !== "localhost"
    && !window.location.hostname.endsWith(".localhost");

if (isPublicHttpPage) {
    const siteUrl = `${window.location.origin}${window.location.pathname}`;
    const shareMessage = `Take a look at Loc Haven: ${siteUrl}`;
    shareSiteLink.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    shareSiteLink.hidden = false;
}

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

const recommendations = {
    "Sisterlocks consultation": "Start with a one-to-one conversation about your hair, your routine, and the questions on your mind.",
    "Sisterlocks establishment": "Talk through a considered start and the foundation that fits your hair and lifestyle.",
    "Retightening & maintenance": "Explore ongoing care to support healthy growth and keep your locs feeling like you.",
    "Loc care guidance": "Get practical support for your at-home routine and the questions that come along the way."
};
const recommendationPanel = document.querySelector("#service-recommendation");
const recommendationTitle = document.querySelector("#recommendation-title");
const recommendationDescription = document.querySelector("#recommendation-description");
const recommendationLink = document.querySelector("#recommendation-link");

recommendationLink.addEventListener("click", () => {
    serviceSelect.value = recommendationLink.dataset.service;
});

document.querySelectorAll("[data-recommendation]").forEach((button) => {
    button.addEventListener("click", () => {
        const service = button.dataset.recommendation;

        document.querySelectorAll("[data-recommendation]").forEach((choice) => {
            choice.setAttribute("aria-pressed", String(choice === button));
        });

        recommendationTitle.textContent = service;
        recommendationDescription.textContent = recommendations[service];
        recommendationLink.dataset.service = service;
        recommendationPanel.hidden = false;
    });
});

bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(bookingForm);
    const message = [
        "Hello Loc Haven, I'd like to ask about booking.",
        `Name: ${formData.get("name")}`,
        formData.get("email") ? `Email: ${formData.get("email")}` : null,
        `Interested in: ${formData.get("service")}`,
        `Appointment location: ${formData.get("visit") || "I'd like to discuss options."}`,
        `Message: ${formData.get("message") || "No additional details."}`
    ].filter(Boolean).join("\n");

    const body = encodeURIComponent(message);
    window.location.href = `https://wa.me/254723116262?text=${body}`;
});