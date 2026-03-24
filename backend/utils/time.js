const appTimeZone = process.env.APP_TIMEZONE || "Asia/Kolkata";

function getCurrentDayName() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: appTimeZone,
  }).format(new Date());
}

function getCurrentDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
  }).format(new Date());
}

function getDayOfMonth() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: appTimeZone,
    }).format(new Date())
  );
}

module.exports = {
  appTimeZone,
  getCurrentDayName,
  getCurrentDateKey,
  getDayOfMonth,
};
