FROM node:22-slim AS builder
WORKDIR /app

# --- Build the API (TypeScript -> dist/) ---
COPY package.json ./
RUN npm install
COPY src/ src/
COPY catalog/ catalog/
COPY assets/ assets/
# Write a self-contained tsconfig (no extends needed inside Docker build context)
RUN printf '{\n\
  "compilerOptions": {\n\
    "target": "ES2022",\n\
    "module": "Node16",\n\
    "moduleResolution": "Node16",\n\
    "strict": true,\n\
    "esModuleInterop": true,\n\
    "skipLibCheck": true,\n\
    "forceConsistentCasingInFileNames": true,\n\
    "resolveJsonModule": true,\n\
    "declaration": true,\n\
    "declarationMap": true,\n\
    "sourceMap": true,\n\
    "outDir": "./dist",\n\
    "rootDir": "./src"\n\
  },\n\
  "include": ["src/**/*"]\n\
}\n' > tsconfig.json
RUN npx tsc

# --- Build the SPA (Vite -> dist/client/) ---
# The client lives under packages/api/client/ and is NOT an npm workspace; its
# package-lock.json is installed standalone so sharp/vite resolve from inside.
# Vite's outDir = '../dist/client', so building from /app/client lands in
# /app/dist/client — exactly where the API's static-file middleware expects it.
COPY client/ client/
WORKDIR /app/client
RUN npm ci && npm run build

# --- Runtime image ---
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/catalog ./catalog
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3900
CMD ["node", "dist/index.js"]
