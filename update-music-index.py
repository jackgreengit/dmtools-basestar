#!/usr/bin/env python3
"""
Update Music Index
Regenerates the music-index.json file by scanning the music directory
"""

import os
import json

def generate_music_index():
    music_dir = "music"
    music_index = {}

    # Audio file extensions to include
    audio_extensions = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'}

    # Walk through the music directory
    for category in sorted(os.listdir(music_dir)):
        category_path = os.path.join(music_dir, category)

        # Skip if not a directory
        if not os.path.isdir(category_path):
            continue

        music_index[category] = {}

        # Walk through each category
        for collection in sorted(os.listdir(category_path)):
            collection_path = os.path.join(category_path, collection)

            # Skip if not a directory
            if not os.path.isdir(collection_path):
                continue

            # Get all audio files in this collection
            tracks = []
            for file in sorted(os.listdir(collection_path)):
                file_path = os.path.join(collection_path, file)

                # Check if it's a file and has an audio extension
                if os.path.isfile(file_path):
                    _, ext = os.path.splitext(file)
                    if ext.lower() in audio_extensions:
                        tracks.append(os.path.join(category, collection, file))

            # Only add collection if it has tracks
            if tracks:
                music_index[category][collection] = tracks

    # Write to music-index.json
    with open('music-index.json', 'w', encoding='utf-8') as f:
        json.dump(music_index, f, indent=2, ensure_ascii=False)

    # Print summary
    total_collections = sum(len(collections) for collections in music_index.values())
    total_tracks = sum(len(tracks) for category in music_index.values() for tracks in category.values())

    print("✓ Music index updated successfully!")
    print(f"  Categories: {len(music_index)}")
    print(f"  Collections: {total_collections}")
    print(f"  Total tracks: {total_tracks}")
    print("\nRefresh your browser to see the changes.")

if __name__ == "__main__":
    generate_music_index()
