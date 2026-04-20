for file in *.json; do
    jq . "$file" | sponge "$file"
done
