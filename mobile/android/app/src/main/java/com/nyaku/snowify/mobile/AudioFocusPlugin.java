package com.nyaku.snowify.mobile;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AudioFocus")
public class AudioFocusPlugin extends Plugin implements AudioManager.OnAudioFocusChangeListener {

    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;

    @Override
    public void load() {
        super.load();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void requestFocus(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attrs)
                    .setOnAudioFocusChangeListener(this)
                    .setWillPauseWhenDucked(false)
                    .build();
            int result = audioManager.requestAudioFocus(focusRequest);
            JSObject ret = new JSObject();
            ret.put("granted", result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
            call.resolve(ret);
        } else {
            @SuppressWarnings("deprecation")
            int result = audioManager.requestAudioFocus(this,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN);
            JSObject ret = new JSObject();
            ret.put("granted", result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void abandonFocus(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            //noinspection deprecation
            audioManager.abandonAudioFocus(this);
        }
        call.resolve();
    }

    @Override
    public void onAudioFocusChange(int focusChange) {
        JSObject data = new JSObject();
        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_GAIN:
                data.put("type", "gain");
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
                data.put("type", "loss");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                data.put("type", "lossTransient");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                data.put("type", "duck");
                break;
            default:
                return;
        }
        notifyListeners("audioFocusChange", data);
    }
}
