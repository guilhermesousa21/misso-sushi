import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://taznskxoczjxnodylgnl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhem5za3hvY3pqeG5vZHlsZ25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjgzMjgsImV4cCI6MjA5NjUwNDMyOH0.I2sc4hqVLjkP7X8--dFCFQ8Vl4i_cTB2MI7Mh5KqcOY"
);