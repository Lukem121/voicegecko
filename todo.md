Todo

- [ ] there is a bug that if for example we had a session so we're logged in so the desktop app thinks of a session but it's no longer authorised like it's an old session it just carries on it doesn't like notice and logs out or anything
- [ ] I noticed that if we have been marked as no internet, then the Gecko bar needs to be restarted in order to detect that again. It doesn't seem to be getting updated to let it know that the internet has been regained.
- [ ] I'm noticing that the gecko bar is getting, when the application is first launched, it's just appearing randomly like in the kind of center of my screen. And then obviously once the app is fully launched, we're actually positioning it correctly. I think what we should do is wait until we've positioned it before we make the gecko bar visible.

Pre Launch Checks

- [ ] Check added stripe student coupon code: RYGALTMSXJAAWould it be better if instead we had a specific point that I would position manually where the actual eyes are? I imagine part of this is because we are trying to do this relative to the component, but the component is kind of bigger or we've centred it. We're doing it from the middle of the component, which is like the belly and not the eyes.
- [ ] Inside BetterAuth we are only allowing MY emails to sign up. We need to remove that.
- [ ] Check all links are working including in emails.

After MVP

- [ ] The voice gecko bar is appearing in a weird location. We should hide it until it's being positioned correctly.
- [ ] Turn off the audio processing logs 'audio_debug'
- [ ] Post processing, fix grammer, change style.
- [ ] I notice whisper when it can mute the audio without having to just mute the whole It can like mute everything else. It can just like isolate its own audio.

🪳 After MVP Bugs

- [ ] Unable to click through the Geckobar window in the transparent sections (stuff under it is uncliclickable).
- [ ] When the user has reached there usage allowance in the desktop app it will let them do one more transcription before blocking them.
