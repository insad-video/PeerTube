/* eslint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import 'mocha'
import { omit } from 'lodash'
import {
  cleanupTests,
  createSingleServer,
  makeDeleteRequest,
  makeGetRequest,
  makePutBodyRequest,
  PeerTubeServer,
  setAccessTokensToServers
} from '@shared/server-commands'
import { CustomConfig, HttpStatusCode } from '@shared/models'

describe('Test config API validators', function () {
  const path = '/api/v1/config/custom'
  let server: PeerTubeServer
  let userAccessToken: string
  const updateParams: CustomConfig = {
    instance: {
      name: 'PeerTube updated',
      shortDescription: 'my short description',
      description: 'my super description',
      terms: 'my super terms',
      codeOfConduct: 'my super coc',

      creationReason: 'my super reason',
      moderationInformation: 'my super moderation information',
      administrator: 'Kuja',
      maintenanceLifetime: 'forever',
      businessModel: 'my super business model',
      hardwareInformation: '2vCore 3GB RAM',

      languages: [ 'en', 'es' ],
      categories: [ 1, 2 ],

      isNSFW: true,
      defaultNSFWPolicy: 'blur',

      defaultClientRoute: '/videos/recently-added',

      customizations: {
        javascript: 'alert("coucou")',
        css: 'body { background-color: red; }'
      }
    },
    theme: {
      default: 'default'
    },
    services: {
      twitter: {
        username: '@MySuperUsername',
        whitelisted: true
      }
    },
    client: {
      videos: {
        miniature: {
          preferAuthorDisplayName: false
        }
      },
      menu: {
        login: {
          redirectOnSingleExternalAuth: false
        }
      }
    },
    cache: {
      previews: {
        size: 2
      },
      captions: {
        size: 3
      },
      torrents: {
        size: 4
      }
    },
    signup: {
      enabled: false,
      limit: 5,
      requiresEmailVerification: false,
      minimumAge: 16
    },
    admin: {
      email: 'superadmin1@example.com'
    },
    contactForm: {
      enabled: false
    },
    user: {
      videoQuota: 5242881,
      videoQuotaDaily: 318742
    },
    videoChannels: {
      maxPerUser: 20
    },
    transcoding: {
      enabled: true,
      allowAdditionalExtensions: true,
      allowAudioFiles: true,
      concurrency: 1,
      threads: 1,
      profile: 'vod_profile',
      resolutions: {
        '0p': false,
        '144p': false,
        '240p': false,
        '360p': true,
        '480p': true,
        '720p': false,
        '1080p': false,
        '1440p': false,
        '2160p': false
      },
      webtorrent: {
        enabled: true
      },
      hls: {
        enabled: false
      }
    },
    live: {
      enabled: true,

      allowReplay: false,
      latencySetting: {
        enabled: false
      },
      maxDuration: 30,
      maxInstanceLives: -1,
      maxUserLives: 50,

      transcoding: {
        enabled: true,
        threads: 4,
        profile: 'live_profile',
        resolutions: {
          '144p': true,
          '240p': true,
          '360p': true,
          '480p': true,
          '720p': true,
          '1080p': true,
          '1440p': true,
          '2160p': true
        }
      }
    },
    videoEditor: {
      enabled: true
    },
    import: {
      videos: {
        concurrency: 1,
        http: {
          enabled: false
        },
        torrent: {
          enabled: false
        }
      }
    },
    trending: {
      videos: {
        algorithms: {
          enabled: [ 'best', 'hot', 'most-viewed', 'most-liked' ],
          default: 'most-viewed'
        }
      }
    },
    autoBlacklist: {
      videos: {
        ofUsers: {
          enabled: false
        }
      }
    },
    followers: {
      instance: {
        enabled: false,
        manualApproval: true
      }
    },
    followings: {
      instance: {
        autoFollowBack: {
          enabled: true
        },
        autoFollowIndex: {
          enabled: true,
          indexUrl: 'https://index.example.com'
        }
      }
    },
    broadcastMessage: {
      enabled: true,
      dismissable: true,
      message: 'super message',
      level: 'warning'
    },
    search: {
      remoteUri: {
        users: true,
        anonymous: true
      },
      searchIndex: {
        enabled: true,
        url: 'https://search.joinpeertube.org',
        disableLocalSearch: true,
        isDefaultSearch: true
      }
    }
  }

  // ---------------------------------------------------------------

  before(async function () {
    this.timeout(30000)

    server = await createSingleServer(1)

    await setAccessTokensToServers([ server ])

    const user = {
      username: 'user1',
      password: 'password'
    }
    await server.users.create({ username: user.username, password: user.password })
    userAccessToken = await server.login.getAccessToken(user)
  })

  describe('When getting the configuration', function () {
    it('Should fail without token', async function () {
      await makeGetRequest({
        url: server.url,
        path,
        expectedStatus: HttpStatusCode.UNAUTHORIZED_401
      })
    })

    it('Should fail if the user is not an administrator', async function () {
      await makeGetRequest({
        url: server.url,
        path,
        token: userAccessToken,
        expectedStatus: HttpStatusCode.FORBIDDEN_403
      })
    })
  })

  describe('When updating the configuration', function () {
    it('Should fail without token', async function () {
      await makePutBodyRequest({
        url: server.url,
        path,
        fields: updateParams,
        expectedStatus: HttpStatusCode.UNAUTHORIZED_401
      })
    })

    it('Should fail if the user is not an administrator', async function () {
      await makePutBodyRequest({
        url: server.url,
        path,
        fields: updateParams,
        token: userAccessToken,
        expectedStatus: HttpStatusCode.FORBIDDEN_403
      })
    })

    it('Should fail if it misses a key', async function () {
      const newUpdateParams = omit(updateParams, 'admin.email')

      await makePutBodyRequest({
        url: server.url,
        path,
        fields: newUpdateParams,
        token: server.accessToken,
        expectedStatus: HttpStatusCode.BAD_REQUEST_400
      })
    })

    it('Should fail with a bad default NSFW policy', async function () {
      const newUpdateParams = {
        ...updateParams,

        instance: {
          defaultNSFWPolicy: 'hello'
        }
      }

      await makePutBodyRequest({
        url: server.url,
        path,
        fields: newUpdateParams,
        token: server.accessToken,
        expectedStatus: HttpStatusCode.BAD_REQUEST_400
      })
    })

    it('Should fail if email disabled and signup requires email verification', async function () {
      // opposite scenario - success when enable enabled - covered via tests/api/users/user-verification.ts
      const newUpdateParams = {
        ...updateParams,

        signup: {
          enabled: true,
          limit: 5,
          requiresEmailVerification: true
        }
      }

      await makePutBodyRequest({
        url: server.url,
        path,
        fields: newUpdateParams,
        token: server.accessToken,
        expectedStatus: HttpStatusCode.BAD_REQUEST_400
      })
    })

    it('Should fail with a disabled webtorrent & hls transcoding', async function () {
      const newUpdateParams = {
        ...updateParams,

        transcoding: {
          hls: {
            enabled: false
          },
          webtorrent: {
            enabled: false
          }
        }
      }

      await makePutBodyRequest({
        url: server.url,
        path,
        fields: newUpdateParams,
        token: server.accessToken,
        expectedStatus: HttpStatusCode.BAD_REQUEST_400
      })
    })

    it('Should success with the correct parameters', async function () {
      await makePutBodyRequest({
        url: server.url,
        path,
        fields: updateParams,
        token: server.accessToken,
        expectedStatus: HttpStatusCode.OK_200
      })
    })
  })

  describe('When deleting the configuration', function () {
    it('Should fail without token', async function () {
      await makeDeleteRequest({
        url: server.url,
        path,
        expectedStatus: HttpStatusCode.UNAUTHORIZED_401
      })
    })

    it('Should fail if the user is not an administrator', async function () {
      await makeDeleteRequest({
        url: server.url,
        path,
        token: userAccessToken,
        expectedStatus: HttpStatusCode.FORBIDDEN_403
      })
    })
  })

  after(async function () {
    await cleanupTests([ server ])
  })
})
