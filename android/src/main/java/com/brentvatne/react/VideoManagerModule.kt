package com.brentvatne.react

import android.content.pm.PackageManager
import android.os.Build
import com.brentvatne.common.api.Source
import com.brentvatne.exoplayer.ReactExoplayerView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import kotlin.math.roundToInt

class VideoManagerModule(reactContext: ReactApplicationContext?) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = REACT_CLASS

    private fun performOnPlayerView(reactTag: Int, callback: (ReactExoplayerView?) -> Unit) {
        UiThreadUtil.runOnUiThread {
            try {
                val uiManager = UIManagerHelper.getUIManager(
                    reactApplicationContext,
                    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) UIManagerType.FABRIC else UIManagerType.DEFAULT
                )

                val view = uiManager?.resolveView(reactTag)

                if (view is ReactExoplayerView) {
                    callback(view)
                } else {
                    callback(null)
                }
            } catch (e: Exception) {
                callback(null)
            }
        }
    }

    @ReactMethod
    fun setPlayerPauseStateCmd(reactTag: Int, paused: Boolean?) {
        performOnPlayerView(reactTag) {
            it?.setPausedModifier(paused!!)
        }
    }

    @ReactMethod
    @Suppress("UNUSED_PARAMETER") // codegen compatibility
    fun seekCmd(reactTag: Int, time: Float, tolerance: Float) {
        performOnPlayerView(reactTag) {
            it?.seekTo((time * 1000f).roundToInt().toLong())
        }
    }

    @ReactMethod
    fun setVolumeCmd(reactTag: Int, volume: Float) {
        performOnPlayerView(reactTag) {
            it?.setVolumeModifier(volume)
        }
    }

    @ReactMethod
    fun setFullScreenCmd(reactTag: Int, fullScreen: Boolean) {
        performOnPlayerView(reactTag) {
            it?.setFullscreen(fullScreen)
        }
    }

    @ReactMethod
    fun enterPictureInPictureCmd(reactTag: Int) {
        performOnPlayerView(reactTag) {
            it?.enterPictureInPictureMode()
        }
    }

    @ReactMethod
    fun exitPictureInPictureCmd(reactTag: Int) {
        performOnPlayerView(reactTag) {
            it?.exitPictureInPictureMode()
        }
    }

    @ReactMethod
    fun setSourceCmd(reactTag: Int, source: ReadableMap?) {
        performOnPlayerView(reactTag) {
            it?.setSrc(Source.parse(source, reactApplicationContext))
        }
    }

    @ReactMethod
    fun getCurrentPosition(reactTag: Int, promise: Promise) {
        performOnPlayerView(reactTag) {
            it?.getCurrentPosition(promise)
        }
    }

    /**
     * Picture in Picture necesita Android 8 y que el dispositivo declare la
     * característica: los emuladores sin ella, la TV o algunos fabricantes no la
     * tienen. Quien dibuje los controles puede preguntar antes de ofrecer el botón.
     */
    @ReactMethod
    fun isPictureInPictureSupported(promise: Promise) {
        val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            reactApplicationContext.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
        promise.resolve(supported)
    }

    companion object {
        private const val REACT_CLASS = "VideoManager"
    }
}
