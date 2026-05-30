const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth.middleware");
const { toggleWishlist, getWishlist, checkWishlist, getWishlistIds } = require("../controllers/wishlist.controller");

// All routes require authentication
router.post("/toggle/:resourceId", authenticate, toggleWishlist);
router.get("/", authenticate, getWishlist);
router.get("/ids", authenticate, getWishlistIds);
router.get("/check/:resourceId", authenticate, checkWishlist);

module.exports = router;
