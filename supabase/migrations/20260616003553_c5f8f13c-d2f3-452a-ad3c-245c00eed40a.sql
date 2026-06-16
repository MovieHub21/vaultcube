-- Allow authenticated users to insert transactions where they are involved
CREATE POLICY "Users can insert transactions they are part of"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);