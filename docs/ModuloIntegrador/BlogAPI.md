Claro — vou gerar **um por um**. Começando pelo **#1: OpenAPI (Swagger) da Blog Publishing API (v1)**, já com **idempotência**, **capabilities**, **taxonomia**, **mídia** e **erros padronizados**.

> **Arquivo 01 — `blog-publishing-api.openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: Blog Publishing API
  version: "1.0.0"
  description: >
    API padronizada para criação/edição/exclusão de posts e taxonomia (tags/categorias),
    com foco em confiabilidade (idempotência, rastreabilidade, auditoria) para integração
    com um Publisher Hub externo.
servers:
  - url: https://example-blog.com/api
    description: Production
  - url: https://staging.example-blog.com/api
    description: Staging

tags:
  - name: System
  - name: Posts
  - name: Media
  - name: Taxonomy
  - name: Authors

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /v1/health:
    get:
      tags: [System]
      summary: Health check
      operationId: getHealth
      security: []
      responses:
        "200":
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/HealthResponse"

  /v1/capabilities:
    get:
      tags: [System]
      summary: Returns supported features/capabilities of this blog API
      operationId: getCapabilities
      responses:
        "200":
          description: Capabilities
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CapabilitiesResponse"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

  /v1/posts:
    post:
      tags: [Posts]
      summary: Create a post
      operationId: createPost
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PostCreateRequest"
      responses:
        "201":
          description: Post created
          headers:
            X-Request-Id:
              $ref: "#/components/headers/XRequestId"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PostWriteResponse"
        "409":
          description: Conflict (duplicate slug/external_id or idempotency conflict)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "422":
          $ref: "#/components/responses/ValidationError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"
    get:
      tags: [Posts]
      summary: List posts (optional utility)
      operationId: listPosts
      parameters:
        - $ref: "#/components/parameters/RequestId"
        - name: status
          in: query
          schema:
            $ref: "#/components/schemas/PostStatus"
        - name: language
          in: query
          schema:
            type: string
            example: pt-BR
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: cursor
          in: query
          schema:
            type: string
            nullable: true
      responses:
        "200":
          description: Posts list
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PostListResponse"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

  /v1/posts/{id}:
    get:
      tags: [Posts]
      summary: Get post by id
      operationId: getPost
      parameters:
        - $ref: "#/components/parameters/PostId"
        - $ref: "#/components/parameters/RequestId"
      responses:
        "200":
          description: Post
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Post"
        "404":
          $ref: "#/components/responses/NotFoundError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

    patch:
      tags: [Posts]
      summary: Update a post (partial)
      operationId: updatePost
      parameters:
        - $ref: "#/components/parameters/PostId"
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
        - name: If-Match
          in: header
          required: false
          description: Optional optimistic concurrency control using version/etag
          schema:
            type: string
            example: "v3"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PostUpdateRequest"
      responses:
        "200":
          description: Post updated
          headers:
            X-Request-Id:
              $ref: "#/components/headers/XRequestId"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PostWriteResponse"
        "409":
          description: Conflict (slug in use / version conflict)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "412":
          description: Precondition Failed (If-Match does not match current version)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "422":
          $ref: "#/components/responses/ValidationError"
        "404":
          $ref: "#/components/responses/NotFoundError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"

    delete:
      tags: [Posts]
      summary: Delete a post (soft-delete recommended)
      operationId: deletePost
      parameters:
        - $ref: "#/components/parameters/PostId"
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
        - name: hard
          in: query
          required: false
          description: If true and supported, performs hard delete. Default false.
          schema:
            type: boolean
            default: false
      responses:
        "200":
          description: Deleted
          headers:
            X-Request-Id:
              $ref: "#/components/headers/XRequestId"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DeleteResponse"
        "404":
          $ref: "#/components/responses/NotFoundError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"

  /v1/media:
    post:
      tags: [Media]
      summary: Register or upload media metadata (binary upload can be separate)
      operationId: createMedia
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/MediaCreateRequest"
      responses:
        "201":
          description: Media created
          headers:
            X-Request-Id:
              $ref: "#/components/headers/XRequestId"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Media"
        "422":
          $ref: "#/components/responses/ValidationError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"

  /v1/tags:
    get:
      tags: [Taxonomy]
      summary: Search tags
      operationId: searchTags
      parameters:
        - $ref: "#/components/parameters/RequestId"
        - name: query
          in: query
          required: false
          schema:
            type: string
            example: ai
        - name: language
          in: query
          required: false
          schema:
            type: string
            example: pt-BR
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            minimum: 1
            maximum: 100
      responses:
        "200":
          description: Tags
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TagListResponse"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

    post:
      tags: [Taxonomy]
      summary: Create tag
      operationId: createTag
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TagCreateRequest"
      responses:
        "201":
          description: Tag created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Tag"
        "409":
          description: Tag already exists (slug conflict)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "422":
          $ref: "#/components/responses/ValidationError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"

  /v1/categories:
    get:
      tags: [Taxonomy]
      summary: List categories
      operationId: listCategories
      parameters:
        - $ref: "#/components/parameters/RequestId"
        - name: language
          in: query
          required: false
          schema:
            type: string
            example: pt-BR
      responses:
        "200":
          description: Categories
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CategoryListResponse"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

    post:
      tags: [Taxonomy]
      summary: Create category
      operationId: createCategory
      parameters:
        - $ref: "#/components/parameters/IdempotencyKey"
        - $ref: "#/components/parameters/RequestId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CategoryCreateRequest"
      responses:
        "201":
          description: Category created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Category"
        "409":
          description: Category already exists (slug conflict)
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "422":
          $ref: "#/components/responses/ValidationError"
        "401":
          $ref: "#/components/responses/UnauthorizedError"
        "403":
          $ref: "#/components/responses/ForbiddenError"

  /v1/authors:
    get:
      tags: [Authors]
      summary: List authors
      operationId: listAuthors
      parameters:
        - $ref: "#/components/parameters/RequestId"
        - name: language
          in: query
          required: false
          schema:
            type: string
            example: pt-BR
      responses:
        "200":
          description: Authors
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthorListResponse"
        "401":
          $ref: "#/components/responses/UnauthorizedError"

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API Key with scoped permissions
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    RequestId:
      name: X-Request-Id
      in: header
      required: false
      description: Correlation ID for tracing across systems
      schema:
        type: string
        example: 2b1d7e75-1c3b-4d62-a0f5-5c8cbbe1d8d1

    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: true
      description: Unique key to guarantee idempotent writes (create/update/delete)
      schema:
        type: string
        example: 8f2b0c2b-1c48-4b0c-9b3c-2cc6e1a6e9a1

    PostId:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid

  headers:
    XRequestId:
      description: Correlation ID echoed back
      schema:
        type: string

  responses:
    UnauthorizedError:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          examples:
            unauthorized:
              value:
                error:
                  code: UNAUTHORIZED
                  message: Missing or invalid credentials
                  request_id: "2b1d7e75-1c3b-4d62-a0f5-5c8cbbe1d8d1"

    ForbiddenError:
      description: Forbidden (missing scope/permission)
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          examples:
            forbidden:
              value:
                error:
                  code: FORBIDDEN
                  message: Missing required scope: posts:write
                  request_id: "2b1d7e75-1c3b-4d62-a0f5-5c8cbbe1d8d1"

    NotFoundError:
      description: Not Found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          examples:
            not_found:
              value:
                error:
                  code: NOT_FOUND
                  message: Resource not found
                  request_id: "2b1d7e75-1c3b-4d62-a0f5-5c8cbbe1d8d1"

    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorResponse"
          examples:
            validation:
              value:
                error:
                  code: VALIDATION_ERROR
                  message: Invalid request payload
                  details:
                    - field: title
                      issue: required
                  request_id: "2b1d7e75-1c3b-4d62-a0f5-5c8cbbe1d8d1"

  schemas:
    HealthResponse:
      type: object
      required: [status, time]
      properties:
        status:
          type: string
          enum: [ok]
        time:
          type: string
          format: date-time

    CapabilitiesResponse:
      type: object
      required: [features, limits, auth]
      properties:
        features:
          type: object
          required: [idempotency, soft_delete, taxonomy_autocreate, authors, revisions]
          properties:
            idempotency:
              type: boolean
            soft_delete:
              type: boolean
            taxonomy_autocreate:
              type: boolean
              description: If true, API accepts new tags/categories inline in post payload
            authors:
              type: boolean
            revisions:
              type: boolean
            media_upload:
              type: boolean
        limits:
          type: object
          properties:
            max_content_bytes:
              type: integer
              example: 2000000
            rate_limit_per_minute:
              type: integer
              example: 120
        auth:
          type: object
          properties:
            schemes:
              type: array
              items:
                type: string
                example: ApiKeyAuth
            scopes_supported:
              type: array
              items:
                type: string
              example: ["posts:write","posts:edit","posts:delete","media:write","taxonomy:write"]

    PostStatus:
      type: string
      enum: [draft, scheduled, published, archived]

    ContentFormat:
      type: string
      enum: [markdown, html, blocks]

    PostCreateRequest:
      type: object
      required: [title, content, content_format, status, language]
      properties:
        external_source:
          type: string
          description: Name of the source system (e.g., PublisherHub)
          example: PublisherHub
        external_id:
          type: string
          description: Stable id from source system for reconciliation
          example: "hub_post_0192"
        title:
          type: string
          minLength: 3
        slug:
          type: string
          description: Optional; if omitted, server can generate from title
          example: como-montar-um-plano-de-estudos
        excerpt:
          type: string
          nullable: true
        content:
          type: string
        content_format:
          $ref: "#/components/schemas/ContentFormat"
        status:
          $ref: "#/components/schemas/PostStatus"
        language:
          type: string
          example: pt-BR
        author_id:
          type: string
          format: uuid
          nullable: true
        featured_image_id:
          type: string
          format: uuid
          nullable: true
        published_at:
          type: string
          format: date-time
          nullable: true
        scheduled_at:
          type: string
          format: date-time
          nullable: true

        seo:
          $ref: "#/components/schemas/SeoBlock"

        categories:
          type: array
          description: Category ids or objects (if autocreate supported)
          items:
            $ref: "#/components/schemas/TaxonomyRef"
        tags:
          type: array
          items:
            $ref: "#/components/schemas/TaxonomyRef"

        media:
          type: array
          description: Optional list of media relations for inline/gallery usage
          items:
            $ref: "#/components/schemas/PostMediaRef"

        options:
          type: object
          properties:
            allow_comments:
              type: boolean
              default: true
            canonical_url:
              type: string
              nullable: true

    PostUpdateRequest:
      type: object
      description: Partial update; omit fields you don't want to change
      properties:
        title:
          type: string
          minLength: 3
        slug:
          type: string
        excerpt:
          type: string
          nullable: true
        content:
          type: string
        content_format:
          $ref: "#/components/schemas/ContentFormat"
        status:
          $ref: "#/components/schemas/PostStatus"
        language:
          type: string
        author_id:
          type: string
          format: uuid
          nullable: true
        featured_image_id:
          type: string
          format: uuid
          nullable: true
        published_at:
          type: string
          format: date-time
          nullable: true
        scheduled_at:
          type: string
          format: date-time
          nullable: true
        seo:
          $ref: "#/components/schemas/SeoBlock"
        categories:
          type: array
          items:
            $ref: "#/components/schemas/TaxonomyRef"
        tags:
          type: array
          items:
            $ref: "#/components/schemas/TaxonomyRef"
        media:
          type: array
          items:
            $ref: "#/components/schemas/PostMediaRef"
        options:
          type: object
          properties:
            allow_comments:
              type: boolean
            canonical_url:
              type: string
              nullable: true

    SeoBlock:
      type: object
      properties:
        seo_title:
          type: string
          nullable: true
        seo_description:
          type: string
          nullable: true
        canonical_url:
          type: string
          nullable: true
        og_title:
          type: string
          nullable: true
        og_description:
          type: string
          nullable: true
        og_image_url:
          type: string
          nullable: true
        keywords:
          type: array
          items:
            type: string

    TaxonomyRef:
      description: Either an existing taxonomy id or an object to create/resolve
      oneOf:
        - type: object
          required: [id]
          properties:
            id:
              type: string
              format: uuid
        - type: object
          required: [name]
          properties:
            name:
              type: string
              example: "Imigração"
            slug:
              type: string
              nullable: true
            language:
              type: string
              nullable: true
              example: pt-BR

    PostMediaRef:
      type: object
      required: [media_id]
      properties:
        media_id:
          type: string
          format: uuid
        role:
          type: string
          description: featured|inline|gallery|attachment
          example: inline
        position:
          type: integer
          nullable: true

    PostWriteResponse:
      type: object
      required: [id, status, slug, url, created_at, updated_at]
      properties:
        id:
          type: string
          format: uuid
        status:
          $ref: "#/components/schemas/PostStatus"
        slug:
          type: string
        url:
          type: string
          example: https://example-blog.com/posts/como-montar-um-plano-de-estudos
        version:
          type: integer
          description: Incremented on each update (optional)
          example: 3
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    Post:
      type: object
      required: [id, title, slug, content, content_format, status, language, created_at, updated_at]
      properties:
        id:
          type: string
          format: uuid
        external_source:
          type: string
          nullable: true
        external_id:
          type: string
          nullable: true
        title:
          type: string
        slug:
          type: string
        excerpt:
          type: string
          nullable: true
        content:
          type: string
        content_format:
          $ref: "#/components/schemas/ContentFormat"
        status:
          $ref: "#/components/schemas/PostStatus"
        language:
          type: string
        author_id:
          type: string
          format: uuid
          nullable: true
        featured_image_id:
          type: string
          format: uuid
          nullable: true
        published_at:
          type: string
          format: date-time
          nullable: true
        scheduled_at:
          type: string
          format: date-time
          nullable: true
        seo:
          $ref: "#/components/schemas/SeoBlock"
        categories:
          type: array
          items:
            $ref: "#/components/schemas/Category"
        tags:
          type: array
          items:
            $ref: "#/components/schemas/Tag"
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        deleted_at:
          type: string
          format: date-time
          nullable: true

    PostListResponse:
      type: object
      required: [items, next_cursor]
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/Post"
        next_cursor:
          type: string
          nullable: true

    MediaType:
      type: string
      enum: [image, video, audio, document]

    MediaCreateRequest:
      type: object
      required: [type, url]
      properties:
        external_source:
          type: string
          nullable: true
        external_id:
          type: string
          nullable: true
        type:
          $ref: "#/components/schemas/MediaType"
        url:
          type: string
          description: Public URL or CDN URL
        storage_key:
          type: string
          nullable: true
          description: Internal object storage key (S3/R2/etc.)
        alt_text:
          type: string
          nullable: true
        caption:
          type: string
          nullable: true
        width:
          type: integer
          nullable: true
        height:
          type: integer
          nullable: true

    Media:
      type: object
      required: [id, type, url, created_at]
      properties:
        id:
          type: string
          format: uuid
        type:
          $ref: "#/components/schemas/MediaType"
        url:
          type: string
        storage_key:
          type: string
          nullable: true
        alt_text:
          type: string
          nullable: true
        caption:
          type: string
          nullable: true
        width:
          type: integer
          nullable: true
        height:
          type: integer
          nullable: true
        created_at:
          type: string
          format: date-time

    TagCreateRequest:
      type: object
      required: [name]
      properties:
        name:
          type: string
        slug:
          type: string
          nullable: true
        language:
          type: string
          nullable: true
          example: pt-BR

    Tag:
      type: object
      required: [id, name, slug]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        slug:
          type: string
        language:
          type: string
          nullable: true

    TagListResponse:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/Tag"

    CategoryCreateRequest:
      type: object
      required: [name]
      properties:
        name:
          type: string
        slug:
          type: string
          nullable: true
        parent_id:
          type: string
          format: uuid
          nullable: true
        language:
          type: string
          nullable: true
          example: pt-BR

    Category:
      type: object
      required: [id, name, slug]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        slug:
          type: string
        parent_id:
          type: string
          format: uuid
          nullable: true
        language:
          type: string
          nullable: true

    CategoryListResponse:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/Category"

    Author:
      type: object
      required: [id, name, slug]
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        slug:
          type: string
        bio:
          type: string
          nullable: true
        avatar_media_id:
          type: string
          format: uuid
          nullable: true
        social_links:
          type: object
          additionalProperties:
            type: string

    AuthorListResponse:
      type: object
      required: [items]
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/Author"

    DeleteResponse:
      type: object
      required: [id, deleted]
      properties:
        id:
          type: string
          format: uuid
        deleted:
          type: boolean
          example: true

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              example: VALIDATION_ERROR
            message:
              type: string
            details:
              type: array
              nullable: true
              items:
                type: object
                properties:
                  field:
                    type: string
                  issue:
                    type: string
            request_id:
              type: string
              nullable: true
```

---

