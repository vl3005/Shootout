window.sounds = {
  weapons: [
    new Howl({ src: ['../audio/fire1.wav'], volume: 0.2, html5PoolSize: 10, html5: true}),
    new Howl({ src: ['../audio/fire2.wav'], volume: 0.2, html5PoolSize: 10, html5: true}),
    new Howl({ src: ['../audio/fire3.wav'], volume: 0.2, html5PoolSize: 10, html5: true}),
    new Howl({ src: ['../audio/fire4.wav'], volume: 0.2, html5PoolSize: 10, html5: true})
  ],
  shieldHit: [
    new Howl({ src: ['../audio/shieldHit1.wav'], volume: 0.5, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/shieldHit2.wav'], volume: 0.5, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/shieldHit3.wav'], volume: 0.5, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/shieldHit4.wav'], volume: 0.5, html5PoolSize: 10, html5: true })
  ],
  barrierHits: [
    new Howl({ src: ['../audio/barrierHit1.wav'], volume: 0.3, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/barrierHit2.wav'], volume: 0.3, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/barrierHit3.wav'], volume: 0.3, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/barrierHit4.wav'], volume: 0.3, html5PoolSize: 10, html5: true })
  ],
  physicalHits: [
    new Howl({ src: ['../audio/playerHit1.wav'], volume: 0.4, html5PoolSize: 10, html5: true }),
    new Howl({ src: ['../audio/playerHit2.wav'], volume: 0.4, html5PoolSize: 10, html5: true }),
  ],
  lowEnergy: new Howl({
    src: ['../audio/cantShoot.wav'],
    volume: 0.8,
    html5: true
  }),
  gunDead: new Howl({
    src: ['../audio/gunDead.wav'],
    volume: 0.8,
    html5: true
  }),
  gunRestored: new Howl({
    src: ['../audio/gunRestored.wav'],
    volume: 0.8,
    html5: true
  }),
  counter: new Howl({
    src: ['../audio/counter.mp3', '../audio/counter.wav'],
    volume: 0.2,
    html5: true
  }),
  vortex: new Howl({
    src: ['../audio/vortex.wav'],
    volume: 0.3,
    loop: false,
    html5: true
  }),
  shieldUp: new Howl({
    src: ['../audio/shieldUp.wav'],
    volume: 0.5,
    loop: false,
    html5: true
  }),
  alarm: new Howl({
    src: ['../audio/noShield.wav'],
    volume: 0.8,
    loop: true,
    html5: true
  }),
  die: new Howl({
    src: ['../audio/death3.wav'],
    volume: 0.5,
    html5: true
  }),
  respawned: new Howl({
    src: ['../audio/respawned2.wav'],
    volume: 0.3,
    html5: true,
  }),
  ouch: new Howl({
    src: ['../audio/ouch.wav'],
    volume: 0.5,
    html5: true,
  }),
  playerHitBarr: new Howl({
    src: ['../audio/playerBarrierHit.wav'],
    volume: 1,
    html5: true,
    sprite: {
      cut: [250, 550],
      shieldDead: [5943,826]
    },
      onplay: function (id) {
        setTimeout(function () {
          sounds.playerHitBarr.fade(1, 0.0, 700, id); // Fade from volume 1.0 to 0.0 over 3 seconds
        }, 300);
    }
  }),
  move: new Howl({
    src: ['../audio/ridev6.wav'],
    volume: 0.3,
    sprite: {main:[478,1618]},
    loop: true,
    html5: true,
    html5PoolSize: 10,
    preload: 'true'
  })
}
