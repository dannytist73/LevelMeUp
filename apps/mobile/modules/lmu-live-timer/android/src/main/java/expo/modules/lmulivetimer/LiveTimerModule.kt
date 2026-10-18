// M12 (plan decision 12): a running quest timer or a rest between sets as a live countdown in the notification shade
// and on the lock screen. Android draws the chronometer itself, so it keeps counting with the app closed and this app
// never updates the notification; it goes by itself when its time is up (setTimeoutAfter). Ongoing and silent, on its
// own low channel: the alert when time is up is M7d's timer note, which has sound. Nothing shows without the
// notification permission (Android 13+), and nothing throws: a phone that refuses simply shows nothing.
package expo.modules.lmulivetimer

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL = "lmu-live"
private const val TAG = "lmu-live"

class LiveTimerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LmuLiveTimer")

    // Shows (or replaces) live timer `id`: counting down to `at` (ms since the epoch), or up from it.
    Function("show") { id: Int, title: String, text: String, at: Double, countDown: Boolean, channelName: String ->
      show(id, title, text, at.toLong(), countDown, channelName)
    }

    Function("clear") { id: Int ->
      val context = appContext.reactContext ?: return@Function
      NotificationManagerCompat.from(context).cancel(TAG, id)
    }
  }

  private fun show(id: Int, title: String, text: String, at: Long, countDown: Boolean, channelName: String): Boolean {
    val context = appContext.reactContext ?: return false
    if (Build.VERSION.SDK_INT >= 33 &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, channelName, NotificationManager.IMPORTANCE_LOW).apply {
        setShowBadge(false)
        setSound(null, null)
        enableVibration(false)
      }
      manager.createNotificationChannel(channel)
    }
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(icon(context))
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setShowWhen(true)
      .setWhen(at)
      .setUsesChronometer(true)
      .setChronometerCountDown(countDown)
    if (countDown) {
      val left = at - System.currentTimeMillis()
      if (left <= 0) return false
      builder.setTimeoutAfter(left)
    }
    launchIntent(context, id)?.let { builder.setContentIntent(it) }
    return try {
      NotificationManagerCompat.from(context).notify(TAG, id, builder.build())
      true
    } catch (e: SecurityException) {
      false
    }
  }

  // The app's notification icon (made by the expo-notifications config plugin), else the app's own.
  private fun icon(context: Context): Int {
    val res = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (res != 0) res else context.applicationInfo.icon
  }

  // A tap opens the app where it was.
  private fun launchIntent(context: Context, id: Int): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    intent.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
    return PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
}
