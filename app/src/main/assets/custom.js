window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
        'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault()
        console.log('handle origin', origin)
        location.href = origin.href
    } else {
        console.log('not handle origin', origin)
    }
}

window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
}

document.addEventListener('click', hookClick, { capture: true })

// ---------- 注入 $msg ----------
(function () {
    // 标记：当前运行在 PakePlus 打包的应用内
    window.__PAKEPLUS__ = true

    const APP_NAME = 'YunyiLife'

    // 兜底提示
    function fallback(message) {
        try {
            alert(message)
        } catch (e) {
            console.warn('alert 失败:', e)
        }
    }

    // 电脑端：Tauri 通知
    function sendTauriNotification(message) {
        try {
            const tauri = window.__TAURI__
            if (tauri && tauri.notification && typeof tauri.notification.sendNotification === 'function') {
                tauri.notification.sendNotification({
                    title: APP_NAME,
                    body: String(message)
                })
                return true
            }
        } catch (e) {
            console.warn('Tauri 通知失败:', e)
        }
        return false
    }

    // 手机端：Service Worker 通知
    function sendServiceWorkerNotification(message) {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            return false
        }

        const doNotify = (reg) => {
            try {
                reg.showNotification(APP_NAME, {
                    body: String(message),
                    tag: 'pakeplus-msg',        // 相同 tag 会替换旧通知，避免刷屏
                    renotify: true,             // 替换时重新提醒
                    vibrate: [200, 100, 200],   // 震动模式
                    data: { time: Date.now() }
                })
            } catch (e) {
                console.warn('showNotification 失败:', e)
                fallback(message)
            }
        }

        // 已有权限，直接发
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(doNotify).catch(() => fallback(message))
            return true
        }

        // 已被拒绝，无法发通知
        if (Notification.permission === 'denied') {
            return false
        }

        // 请求权限
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                navigator.serviceWorker.ready.then(doNotify).catch(() => fallback(message))
            } else {
                fallback(message)
            }
        })
        return true
    }

    // 统一入口
    function notify(message) {
        // 1. 电脑端 Tauri
        if (sendTauriNotification(message)) {
            return
        }
        // 2. 手机端 Service Worker
        if (sendServiceWorkerNotification(message)) {
            return
        }
        // 3. 兜底
        fallback(message)
    }

    // 挂载 $msg，供前端判断和调用
    window.$msg = notify

    // 注册 Service Worker（供手机端通知使用）
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.warn('Service Worker 注册失败:', err)
            })
        })
    }
})()