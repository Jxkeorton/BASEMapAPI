import { supabaseAdmin } from "./supabase";

export const MAX_SUBMISSION_IMAGES = 5;

/**
 * Fetch images for multiple submissions and return a map of submission_id -> image_urls[]
 * Images are ordered by created_at
 */
export async function getSubmissionImagesMap(
  submissionIds: string[],
): Promise<Record<string, string[]>> {
  if (submissionIds.length === 0) {
    return {};
  }

  const { data: images, error } = await supabaseAdmin
    .from("location_submission_images")
    .select("submission_id, image_url, created_at")
    .in("submission_id", submissionIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching submission images:", error);
    return {};
  }

  // Group images by submission ID
  const imagesMap: Record<string, string[]> = {};
  for (const img of images || []) {
    if (!imagesMap[img.submission_id]) {
      imagesMap[img.submission_id] = [];
    }
    imagesMap[img.submission_id].push(img.image_url);
  }

  return imagesMap;
}

/**
 * Fetch images for a single submission
 * Images are ordered by created_at
 */
export async function getSubmissionImages(
  submissionId: string,
): Promise<string[]> {
  const { data: images, error } = await supabaseAdmin
    .from("location_submission_images")
    .select("image_url, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching submission images:", error);
    return [];
  }

  return (images || []).map((img) => img.image_url);
}

/**
 * Update images for a submission (delete existing and insert new)
 * Returns true if successful
 */
export async function updateSubmissionImages(
  submissionId: string,
  images: string[] | null,
): Promise<boolean> {
  // Delete existing images
  const { error: deleteError } = await supabaseAdmin
    .from("location_submission_images")
    .delete()
    .eq("submission_id", submissionId);

  if (deleteError) {
    console.error("Error deleting submission images:", deleteError);
    return false;
  }

  // Insert new images if provided and not null/empty
  if (images && images.length > 0) {
    const imageInserts = images.map((url) => ({
      submission_id: submissionId,
      image_url: url,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("location_submission_images")
      .insert(imageInserts);

    if (insertError) {
      console.error("Error inserting submission images:", insertError);
      return false;
    }
  }

  return true;
}

/**
 * Create images for a new submission
 * Returns true if successful
 */
export async function createSubmissionImages(
  submissionId: string,
  images: string[],
): Promise<boolean> {
  if (images.length === 0) {
    return true;
  }

  const imageInserts = images.map((url) => ({
    submission_id: submissionId,
    image_url: url,
  }));

  const { error } = await supabaseAdmin
    .from("location_submission_images")
    .insert(imageInserts);

  if (error) {
    console.error("Error creating submission images:", error);
    return false;
  }

  return true;
}
