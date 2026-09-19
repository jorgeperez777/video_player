package com.brentvatne.exoplayer

import androidx.media3.common.C
import androidx.media3.datasource.HttpDataSource.HttpDataSourceException
import androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy
import androidx.media3.exoplayer.upstream.LoadErrorHandlingPolicy.LoadErrorInfo
import java.io.InterruptedIOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException
import kotlin.math.min

class ReactExoplayerLoadErrorHandlingPolicy(private val minLoadRetryCount: Int) : DefaultLoadErrorHandlingPolicy(minLoadRetryCount) {
    override fun getRetryDelayMsFor(loadErrorInfo: LoadErrorInfo): Long =
        if (isConnectivityError(loadErrorInfo.exception)) {
            // No network (or it dropped mid-playback): keep retrying until it comes back.
            CONNECTIVITY_RETRY_DELAY_MS
        } else if (loadErrorInfo.errorCount < minLoadRetryCount) {
            min(((loadErrorInfo.errorCount - 1) * 1000L), 5000L) // Default timeout handling
        } else {
            C.TIME_UNSET // Done retrying and will return the error immediately
        }

    override fun getMinimumLoadableRetryCount(dataType: Int): Int = Int.MAX_VALUE

    /**
     * True for errors caused by the network being unavailable rather than by the server
     * (a server answering 403/404/5xx is an [InvalidResponseCodeException] and is *not*
     * treated as connectivity: retrying forever would never succeed).
     */
    private fun isConnectivityError(exception: Exception): Boolean {
        if (exception is InvalidResponseCodeException) return false

        // Legacy message-based detection kept for OkHttp/Cronet data sources.
        val message = exception.message
        if (exception is HttpDataSourceException &&
            (message == "Unable to connect" || message == "Software caused connection abort")
        ) {
            return true
        }

        var cause: Throwable? = exception
        var depth = 0
        while (cause != null && depth < MAX_CAUSE_DEPTH) {
            when (cause) {
                is UnknownHostException, // DNS: "Unable to resolve host" (wifi/data off)
                is ConnectException,
                is NoRouteToHostException,
                is SocketTimeoutException,
                is SocketException, // connection reset / network unreachable
                is SSLException, // TLS handshake dropped by a flaky link
                is InterruptedIOException -> return true
            }
            cause = cause.cause
            depth++
        }
        return false
    }

    private companion object {
        const val CONNECTIVITY_RETRY_DELAY_MS = 1000L
        const val MAX_CAUSE_DEPTH = 8
    }
}
