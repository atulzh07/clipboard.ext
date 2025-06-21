document.addEventListener("DOMContentLoaded", function () {
  const titleInput = document.getElementById("titleInput");
  const valueInput = document.getElementById("valueInput");
  const saveBtn = document.getElementById("saveBtn");
  const savedItemsList = document.getElementById("savedItemsList");
  const notification = document.getElementById("notification");

  let isConfirmationOpen = false;

  loadSavedItems();

  saveBtn.addEventListener("click", saveItem);

  function saveItem() {
    const title = titleInput.value.trim();
    const value = valueInput.value.trim();

    if (!title || !value) {
      showNotification("Please enter both title and value", "error");
      return;
    }

    chrome.storage.sync.get(["savedItems"], function (result) {
      const savedItems = result.savedItems || [];
      const existingIndex = savedItems.findIndex(
        (item) => item.title === title
      );

      if (existingIndex >= 0) {
        savedItems[existingIndex].value = value;
      } else {
        savedItems.push({ title, value });
      }

      chrome.storage.sync.set({ savedItems }, function () {
        titleInput.value = "";
        valueInput.value = "";
        loadSavedItems();
        showNotification("Item saved successfully!", "success");
      });
    });
  }

  function loadSavedItems() {
    chrome.storage.sync.get(["savedItems"], function (result) {
      const savedItems = result.savedItems || [];
      savedItemsList.innerHTML = "";

      if (savedItems.length === 0) {
        savedItemsList.innerHTML = "<p>No items saved yet</p>";
        return;
      }

      savedItems.forEach((item) => {
        const itemElement = document.createElement("div");
        itemElement.className = "saved-item";
        itemElement.innerHTML = `
        <div class="saved-item-content">
          <div class="saved-item-title">${escapeHtml(item.title)}</div>
          <div class="saved-item-value">${escapeHtml(item.value)}</div>
        </div>
        <div class="action-buttons">
          <button class="text-btn copy-btn" data-title="${escapeHtml(
            item.title
          )}">Copy</button>
          <button class="text-btn delete-btn" data-title="${escapeHtml(
            item.title
          )}">Delete</button>
        </div>
      `;

        savedItemsList.appendChild(itemElement);
      });

      document.querySelectorAll(".copy-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const title = this.getAttribute("data-title");
          copyToClipboard(title);
        });
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const title = this.getAttribute("data-title");
          showDeleteConfirmation(title);
        });
      });
    });
  }

  function copyToClipboard(title) {
    chrome.storage.sync.get(["savedItems"], function (result) {
      const savedItems = result.savedItems || [];
      const item = savedItems.find((i) => i.title === title);

      if (item) {
        navigator.clipboard
          .writeText(item.value)
          .then(() => {
            showNotification("Copied to clipboard!", "success");
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
            showNotification("Failed to copy!", "error");
          });
      }
    });
  }

  function showDeleteConfirmation(title) {
    if (isConfirmationOpen) return;
    isConfirmationOpen = true;

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.innerHTML = `
      <div class="confirm-content">
        <p>Are you sure you want to delete "${escapeHtml(title)}"?</p>
        <div class="confirm-buttons">
          <button class="confirm-btn yes">Delete</button>
          <button class="confirm-btn no">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector(".yes").addEventListener("click", function () {
      deleteItem(title);
      closeDialog(dialog);
    });

    dialog.querySelector(".no").addEventListener("click", function () {
      closeDialog(dialog);
    });

    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) {
        closeDialog(dialog);
      }
    });
  }

  function closeDialog(dialog) {
    if (dialog && dialog.parentNode) {
      document.body.removeChild(dialog);
    }
    isConfirmationOpen = false;
  }

  function deleteItem(title) {
    chrome.storage.sync.get(["savedItems"], function (result) {
      const savedItems = result.savedItems || [];
      const updatedItems = savedItems.filter((item) => item.title !== title);

      chrome.storage.sync.set({ savedItems: updatedItems }, function () {
        loadSavedItems();
        showNotification("Item deleted successfully!", "error");
      });
    });
  }

  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove("hidden");

    setTimeout(() => {
      notification.classList.add("hidden");
    }, 3000);
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
