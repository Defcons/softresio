![softres.io logo](/frontend/src/assets/logo-orange.png)

## Development

To get a working development environment with frontend, backend, database and hot reloading of all, just run:
```sh
    docker compose up
```

To get deno for linting and such, use the nix shell or get it else where.
```sh
    nix develop -c $SHELL
```


### Deployment

Automated, just do this

```sh
    git push origin main
```

### Example deployment


> Make sure to fill out the `<SECRET>` stuff with actual secrets

```yaml
services:
  softresio:
    image: "ghcr.io/kofoednielsen/softresio:latest"
    ports:
      - "0.0.0.0:80:8000"
    environment:
      DATABASE_PASSWORD: "<SECRET_DATABASE_PASSWORD>"
      DATABASE_USER: "softres"
      DOMAIN: "<YOUR_DOMAIN_NAME>"
      JWT_SECRET: "<SECRET_JWT_TOKEN>"
    depends_on:
      database:
        condition: "service_healthy"
  database:
    image: "postgres:18"
    environment:
      POSTGRES_PASSWORD: "<SECRET_DATABASE_PASSWORD>"
      POSTGRES_USER: "softres"
    volumes:
      - "softres-database:/var/lib/postgresql/18/docker"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready --username softres"]
      interval: 1s
      timeout: 5s
      retries: 5

volumes:
  softres-database:
```

### Discord login
Go to https://discord.com/developers/applications and create an application.

Then add the following environment variables to your `compose.yml`
```yaml

    DISCORD_LOGIN_ENABLED: true
    DISCORD_CLIENT_ID: <From the link above>
    DISCORD_CLIENT_SECRET: <Also from the link above>
```
