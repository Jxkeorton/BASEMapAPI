import { supabaseAdmin } from "./supabase";

export const MAX_LOCATION_IMAGES = 5;

/**
 * Fetch images for multiple locations and return a map of location_id -> image_urls[]
 * Images are ordered by display_order (nulls last)
 */
export async function getLocationImagesMap(
  locationIds: number[],
): Promise<Record<number, string[]>> {
  if (locationIds.length === 0) {
    return {};
  }

  const { data: images, error } = await supabaseAdmin
    .from("location_images")
    .select("location_id, image_url, display_order")
    .in("location_id", locationIds)
    .order("display_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching location images:", error);
    return {};
  }

  // Group images by location ID
  const imagesMap: Record<number, string[]> = {};
  for (const img of images || []) {
    if (!imagesMap[img.location_id]) {
      imagesMap[img.location_id] = [];
    }
    imagesMap[img.location_id].push(img.image_url);
  }

  return imagesMap;
}

/**
 * Fetch images for a single location
 * Images are ordered by display_order (nulls last)
 */
export async function getLocationImages(locationId: number): Promise<string[]> {
  const { data: images, error } = await supabaseAdmin
    .from("location_images")
    .select("image_url, display_order")
    .eq("location_id", locationId)
    .order("display_order", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Error fetching location images:", error);
    return [];
  }

  return (images || []).map((img) => img.image_url);
}

/**
 * Add images to locations array
 */
export async function addImagesToLocations<T extends { id: number }>(
  locations: T[],
): Promise<(T & { images: string[] })[]> {
  const locationIds = locations.map((loc) => loc.id);
  const imagesMap = await getLocationImagesMap(locationIds);

  return locations.map((location) => ({
    ...location,
    images: imagesMap[location.id] || [],
  }));
}

/**
 * Update images for a location (delete existing and insert new)
 * Returns true if successful
 */
export async function updateLocationImages(
  locationId: number,
  images: string[] | null,
): Promise<boolean> {
  // Delete existing images
  const { error: deleteError } = await supabaseAdmin
    .from("location_images")
    .delete()
    .eq("location_id", locationId);

  if (deleteError) {
    console.error("Error deleting location images:", deleteError);
    return false;
  }

  // Insert new images if provided and not null/empty
  if (images && images.length > 0) {
    const imageInserts = images.map((url, index) => ({
      location_id: locationId,
      image_url: url,
      display_order: index,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("location_images")
      .insert(imageInserts);

    if (insertError) {
      console.error("Error inserting location images:", insertError);
      return false;
    }
  }

  return true;
}

/**
 * Delete all images for a location
 */
export async function deleteLocationImages(locationId: number): Promise<void> {
  await supabaseAdmin
    .from("location_images")
    .delete()
    .eq("location_id", locationId);
}
