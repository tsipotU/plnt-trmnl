FROM node:26-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src/ src/
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

FROM node:26-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3901
CMD ["node", "dist/index.js"]
