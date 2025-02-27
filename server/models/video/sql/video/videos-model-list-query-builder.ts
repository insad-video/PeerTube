import { VideoInclude } from '@shared/models'
import { Sequelize } from 'sequelize'
import { AbstractVideoQueryBuilder } from './shared/abstract-video-query-builder'
import { VideoModelBuilder } from './shared/video-model-builder'
import { BuildVideosListQueryOptions, VideosIdListQueryBuilder } from './videos-id-list-query-builder'

/**
 *
 * Build videos list SQL query and create video models
 *
 */

export class VideosModelListQueryBuilder extends AbstractVideoQueryBuilder {
  protected attributes: { [key: string]: string }

  private innerQuery: string
  private innerSort: string

  private readonly videoModelBuilder: VideoModelBuilder

  constructor (protected readonly sequelize: Sequelize) {
    super(sequelize, 'list')

    this.videoModelBuilder = new VideoModelBuilder(this.mode, this.tables)
  }

  queryVideos (options: BuildVideosListQueryOptions) {
    this.buildInnerQuery(options)
    this.buildMainQuery(options)

    return this.runQuery()
      .then(rows => this.videoModelBuilder.buildVideosFromRows({ rows, include: options.include }))
  }

  private buildInnerQuery (options: BuildVideosListQueryOptions) {
    const idsQueryBuilder = new VideosIdListQueryBuilder(this.sequelize)
    const { query, sort, replacements } = idsQueryBuilder.getQuery(options)

    this.replacements = replacements
    this.innerQuery = query
    this.innerSort = sort
  }

  private buildMainQuery (options: BuildVideosListQueryOptions) {
    this.attributes = {
      '"video".*': ''
    }

    this.addJoin('INNER JOIN "video" ON "tmp"."id" = "video"."id"')

    this.includeChannels()
    this.includeAccounts()
    this.includeThumbnails()

    if (options.include & VideoInclude.FILES) {
      this.includeWebtorrentFiles()
      this.includeStreamingPlaylistFiles()
    }

    if (options.user) {
      this.includeUserHistory(options.user.id)
    }

    if (options.videoPlaylistId) {
      this.includePlaylist(options.videoPlaylistId)
    }

    if (options.include & VideoInclude.BLACKLISTED) {
      this.includeBlacklisted()
    }

    if (options.include & VideoInclude.BLOCKED_OWNER) {
      this.includeBlockedOwnerAndServer(options.serverAccountIdForBlock, options.user)
    }

    const select = this.buildSelect()

    this.query = `${select} FROM (${this.innerQuery}) AS "tmp" ${this.joins} ${this.innerSort}`
  }
}
