package com.nyaku.snowify.mobile;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String APK_FILENAME = "snowify-mobile.apk";

    @PluginMethod
    public void getVersionName(PluginCall call) {
        try {
            String versionName = getContext()
                    .getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0)
                    .versionName;
            JSObject ret = new JSObject();
            ret.put("version", versionName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get version", e);
        }
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url parameter");
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                // Follow redirects (GitHub asset URLs redirect)
                URL downloadUrl = new URL(url);
                conn = (HttpURLConnection) downloadUrl.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("Accept", "application/octet-stream");
                conn.connect();

                int totalSize = conn.getContentLength();
                InputStream in = conn.getInputStream();

                File apkFile = new File(getContext().getExternalCacheDir(), APK_FILENAME);
                FileOutputStream out = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long downloaded = 0;
                int lastPercent = -1;

                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                    downloaded += bytesRead;

                    if (totalSize > 0) {
                        int percent = (int) (downloaded * 100 / totalSize);
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                }

                out.close();
                in.close();

                notifyListeners("downloadComplete", new JSObject());
                call.resolve();

            } catch (Exception e) {
                JSObject error = new JSObject();
                error.put("message", e.getMessage());
                notifyListeners("downloadError", error);
                call.reject("Download failed", e);
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        try {
            File apkFile = new File(getContext().getExternalCacheDir(), APK_FILENAME);
            if (!apkFile.exists()) {
                call.reject("APK file not found");
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            call.resolve();
        } catch (Exception e) {
            call.reject("Install failed", e);
        }
    }
}
