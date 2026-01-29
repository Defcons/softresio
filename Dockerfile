FROM denoland/deno:latest as frontend

WORKDIR /app

# Install dependencies
COPY frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/tsconfig.json frontend/package.json frontend/deno.lock frontend/vite.config.ts frontend/index.html .
RUN deno install

# Copy app
COPY frontend/src/ ./src/
COPY frontend/shared/ ./shared/
COPY frontend/css/ ./css/

RUN deno run build

FROM denoland/deno:latest as backend

WORKDIR /app

# Install dependencies
COPY backend/deno.json backend/deno.lock .
RUN deno install

# Copy app
COPY backend/src/ ./src/
COPY backend/shared/ ./shared/
COPY backend/instances/ ./instances/
COPY --from=frontend /app/dist ./static/
COPY frontend/src/assets/favicon.ico ./static/


CMD ["deno", "serve", "--allow-all", "--parallel", "src/main.ts"]
