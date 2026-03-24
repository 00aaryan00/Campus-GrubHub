# 🚀 Production Deployment Guide

This guide ensures your app works perfectly in production, just like it does in development.

## ✅ What We Fixed

1. **API URL Configuration** - Now uses environment variables instead of hardcoded localhost
2. **Rate Limiting** - Disabled in development, enabled in production with reasonable limits
3. **Duplicate API Calls** - Prevented with loading guards and refs
4. **Error Handling** - Better resilience for non-critical operations

---

## 📋 Production Setup Checklist

### 1. Backend Environment Variables (Render/Your Hosting)

Set these in your backend hosting platform (e.g., Render):

```
NODE_ENV=production
```

**Why?** This enables rate limiting in production to protect your API.

**How to set on Render:**
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Key: `NODE_ENV`, Value: `production`
6. Save and redeploy

**How to set on other platforms:**
- **Vercel**: Settings → Environment Variables → Add `NODE_ENV=production` for Production
- **Heroku**: Settings → Config Vars → Add `NODE_ENV=production`
- **Railway**: Variables tab → Add `NODE_ENV=production`

### 2. Frontend Environment Variables (Vercel/Your Hosting)

Set this in your frontend hosting platform (e.g., Vercel):

```
VITE_API_URL=https://your-backend-url.onrender.com
```

**Replace `your-backend-url.onrender.com` with your actual backend URL!**

**How to set on Vercel:**
1. Go to Vercel dashboard
2. Select your frontend project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Key: `VITE_API_URL`
6. Value: Your backend URL (e.g., `https://campus-grubhub-backend.onrender.com`)
7. Environment: **Production** (and Preview if you want)
8. Save

### 3. Verify Backend is Running

After deployment, check your backend logs. You should see:

```
🚀 Rate Limiter Status:
   Environment: PRODUCTION
   Global Limiter: 100 req/15min
   Heavy Limiter: 30 req/min
```

If you see `DEVELOPMENT` instead, `NODE_ENV` is not set correctly.

### 4. Test Your Production App

1. **Menu Loading**: Should load without 429 errors
2. **Voting**: Should work smoothly
3. **Admin Dashboard**: Should connect to backend
4. **User Authentication**: Should work correctly

---

## 🔧 Current Production Rate Limits

These are reasonable limits that allow normal usage while protecting your API:

- **Global Limiter**: 100 requests per 15 minutes
- **Heavy Endpoints** (`/menu`, `/save-user`, etc.): 30 requests per minute

**Normal usage per page load:**
- `/menu` - 1 request
- `/daily-quote` - 1 request
- `/leaderboard` - 1 request
- `/user-votes` - 1 request (if logged in)
- `/save-user` - 1 request (if logged in)

**Total: ~4-5 requests per page load** - Well within limits! ✅

---

## 🐛 Troubleshooting

### Issue: Still getting 429 errors in production

**Solution:**
1. Check if `NODE_ENV=production` is set in backend
2. Check backend logs to verify rate limiter status
3. Verify the limits are reasonable (100/15min, 30/min)

### Issue: Frontend can't connect to backend

**Solution:**
1. Check if `VITE_API_URL` is set correctly in frontend
2. Verify backend URL is accessible (try opening it in browser)
3. Check CORS settings in backend (should include your frontend domain)

### Issue: Menu not loading in production

**Solution:**
1. Check browser console for errors
2. Verify `VITE_API_URL` points to correct backend
3. Check backend logs for any errors
4. Verify Firebase configuration is correct

---

## 📝 Summary

**For Production to Work Like Development:**

1. ✅ Set `NODE_ENV=production` in backend
2. ✅ Set `VITE_API_URL` in frontend to your backend URL
3. ✅ Verify rate limiter shows "PRODUCTION" in logs
4. ✅ Test all features work correctly

**Rate limits are reasonable** - Normal users won't hit them, but they protect against abuse.

---

## 🎯 Quick Reference

| Environment | Rate Limiting | API URL |
|------------|--------------|---------|
| **Development** | Disabled | `http://localhost:5000` |
| **Production** | Enabled (100/15min, 30/min) | Set via `VITE_API_URL` |

---

**Need Help?** Check your hosting platform's documentation for setting environment variables.
